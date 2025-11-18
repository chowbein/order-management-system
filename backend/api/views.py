from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.db.models import Sum, Q
from .models import Product, Order, OrderItem, InventoryLog, OrderActivity
from .serializers import (
    ProductSerializer, OrderSerializer, OrderItemSerializer, 
    InventoryLogSerializer, OrderActivitySerializer
)


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Product instances.
    Provides CRUD operations: Create, Read, Update, Delete
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production

    def perform_create(self, serializer):
        """
        Automatically create inventory log when a new product is added.
        This ensures all stock additions are tracked from the beginning.
        """
        product = serializer.save()
        InventoryLog.objects.create(
            product=product,
            product_name=product.name,  # Store name for audit trail preservation
            change_type='addition',
            quantity_change=product.stock_quantity,
            reason='Product created'
        )

    def perform_update(self, serializer):
        """
        Track inventory changes when product is updated.
        Only logs if stock_quantity actually changed (not for name/price updates).
        """
        # Capture original stock before saving changes
        original_product = self.get_object()
        original_quantity = original_product.stock_quantity
        
        updated_product = serializer.save()
        new_quantity = updated_product.stock_quantity
        
        # Calculate the difference (positive = addition, negative = deduction)
        quantity_diff = new_quantity - original_quantity
        
        # Only create log if stock actually changed
        if quantity_diff != 0:
            change_type = 'addition' if quantity_diff > 0 else 'deduction'
            InventoryLog.objects.create(
                product=updated_product,
                product_name=updated_product.name,  # Store name for audit trail
                change_type=change_type,
                quantity_change=quantity_diff,
                reason='Stock manually updated'
            )

    def perform_destroy(self, instance):
        """
        Log inventory deduction when deleting a product with stock.
        The log is preserved after deletion (SET_NULL) for audit purposes.
        """
        if instance.stock_quantity > 0:
            InventoryLog.objects.create(
                product=instance,
                product_name=instance.name,  # Preserved even after product deletion
                change_type='deduction',
                quantity_change=-instance.stock_quantity,
                reason=f'Product "{instance.name}" deleted'
            )
        instance.delete()


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Order instances.
    Includes custom action for confirming orders.
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production

    def perform_create(self, serializer):
        """Log order creation activity."""
        order = serializer.save()
        OrderActivity.objects.create(
            order=order,
            activity_type="Order Created",
            description=f"Order {order.order_number} was created with status '{order.status}'."
        )

    @action(detail=True, methods=['post'])
    @transaction.atomic  # CRITICAL: Ensures all-or-nothing operation (rollback on any error)
    def confirm(self, request, pk=None):
        """
        Custom action to confirm an order.
        
        Business Logic:
        1. Validates order status (must be 'pending')
        2. Locks products to prevent concurrent orders from overselling
        3. Validates sufficient stock for ALL items before deducting ANY
        4. Deducts stock and creates audit logs
        5. Updates order status to 'confirmed'
        
        Transaction Safety:
        - @transaction.atomic ensures rollback if ANY step fails
        - select_for_update() prevents race conditions (database row-level lock)
        
        API Endpoint: POST /api/orders/{id}/confirm/
        """
        order = self.get_object()

        # Validation 1: Prevent duplicate confirmations
        if order.status == 'confirmed':
            return Response(
                {'error': 'Order is already confirmed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation 2: Cannot revive cancelled orders
        if order.status == 'cancelled':
            return Response(
                {'error': 'Cannot confirm a cancelled order'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # CRITICAL: Lock product rows to prevent concurrent modifications
        # This prevents two users from confirming orders for the same product simultaneously
        # The 'of=(' parameter locks only the product, not the order items
        order_items = order.items.select_related('product').select_for_update(of=('product',))

        # Validation Phase: Check ALL items BEFORE deducting ANY stock
        # This prevents partial fulfillment - it's all or nothing
        for item in order_items:
            if item.product.stock_quantity < item.quantity:
                return Response(
                    {
                        'error': f'Insufficient stock for product "{item.product.name}". '
                                f'Available: {item.product.stock_quantity}, Required: {item.quantity}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Execution Phase: All validations passed, now deduct stock
        for item in order_items:
            # Deduct inventory
            item.product.stock_quantity -= item.quantity
            item.product.save()

            # Create audit trail for inventory change
            InventoryLog.objects.create(
                product=item.product,
                product_name=item.product.name,  # Store for audit trail
                change_type='deduction',
                quantity_change=-item.quantity,  # Negative indicates deduction
                reason=f'Order {order.order_number} confirmed'
            )

        # Mark order as confirmed
        order.status = 'confirmed'
        order.save()

        # Create activity log for audit trail
        OrderActivity.objects.create(
            order=order,
            activity_type="Order Confirmed",
            description=f"Order status changed to 'confirmed'."
        )

        # Serialize and return the updated order
        serializer = self.get_serializer(order)
        return Response(
            {
                'message': 'Order confirmed successfully',
                'order': serializer.data
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    @transaction.atomic  # Ensures atomic operation for stock restoration
    def cancel(self, request, pk=None):
        """
        Custom action to cancel an order.
        
        Business Logic:
        - ONLY restores inventory if order was 'confirmed' (stock was deducted)
        - Does NOT restore inventory for 'pending' orders (stock never deducted)
        - This prevents inventory manipulation through create -> cancel cycles
        
        API Endpoint: POST /api/orders/{id}/cancel/
        """
        order = self.get_object()

        # Prevent duplicate cancellations
        if order.status == 'cancelled':
            return Response({'error': 'Order is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)

        # IMPORTANT: Only restore stock if order was actually confirmed
        # Pending orders never deducted stock, so there's nothing to restore
        if order.status == 'confirmed':
            order_items = order.items.select_related('product')
            for item in order_items:
                # Return items to inventory
                item.product.stock_quantity += item.quantity
                item.product.save()

                # Log the restoration for audit trail
                InventoryLog.objects.create(
                    product=item.product,
                    product_name=item.product.name,  # Store for audit trail
                    change_type='addition',
                    quantity_change=item.quantity,  # Positive indicates addition
                    reason=f'Order {order.order_number} cancelled (stock restored)'
                )

        # Mark order as cancelled (whether it was pending or confirmed)
        order.status = 'cancelled'
        order.save()

        # Create activity log
        OrderActivity.objects.create(
            order=order,
            activity_type="Order Cancelled",
            description=f"Order status changed to 'cancelled'."
        )

        serializer = self.get_serializer(order)
        return Response(
            {
                'message': 'Order cancelled successfully',
                'order': serializer.data
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='update-item')
    @transaction.atomic  # Ensures inventory and order total stay in sync
    def update_item_quantity(self, request, pk=None):
        """
        Partial order modification - update or remove specific items from confirmed orders.
        
        Use Cases:
        - Customer wants to reduce quantity after order is confirmed
        - Customer wants to remove an item completely
        - new_quantity=0 removes the item entirely
        
        Business Logic:
        - Increase quantity: Deducts additional stock (if available)
        - Decrease quantity: Restores stock to inventory
        - Remove item (qty=0): Restores full quantity, removes from order
        - Updates order total_amount automatically
        
        Request Body: {'order_item_id': <int>, 'new_quantity': <int>}
        API Endpoint: POST /api/orders/{id}/update-item/
        """
        order = self.get_object()
        item_id = request.data.get('order_item_id')
        new_quantity = request.data.get('new_quantity')

        # Validate required parameters
        if item_id is None or new_quantity is None:
            return Response({'error': 'order_item_id and new_quantity are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate quantity is a non-negative integer
        try:
            new_quantity = int(new_quantity)
            if new_quantity < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'New quantity must be a non-negative integer'}, status=status.HTTP_400_BAD_REQUEST)

        # Only allow modifications to confirmed orders (pending orders can be edited before confirmation)
        if order.status != 'confirmed':
            return Response({'error': 'Only items from confirmed orders can be modified.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Lock both the order item and its product to prevent concurrent modifications
            item = OrderItem.objects.select_related('product').select_for_update(of=('self', 'product')).get(id=item_id, order=order)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Order item not found.'}, status=status.HTTP_404_NOT_FOUND)

        product = item.product
        old_quantity = item.quantity
        quantity_diff = new_quantity - old_quantity

        # No change needed
        if quantity_diff == 0:
            return Response({'message': 'No change in quantity', 'order': self.get_serializer(order).data})

        # --- CASE 1: Increasing Quantity (customer wants more) ---
        if quantity_diff > 0:
            # Check if we have enough stock to fulfill the increase
            if product.stock_quantity < quantity_diff:
                return Response({'error': f'Insufficient stock for {product.name}. Only {product.stock_quantity} more available.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Deduct the additional quantity from inventory
            product.stock_quantity -= quantity_diff
            change_type = 'deduction'
            activity_desc = f"Increased quantity of '{product.name}' by {quantity_diff}."
        
        # --- CASE 2: Decreasing Quantity (customer wants less or removing item) ---
        else: # quantity_diff < 0
            # Return the removed quantity back to inventory
            product.stock_quantity += abs(quantity_diff)
            change_type = 'addition'
            activity_desc = f"Decreased quantity of '{product.name}' by {abs(quantity_diff)}."

        # Save inventory changes
        product.save()

        # Recalculate order total (can increase or decrease)
        # Using unit_price from order item (not current product price) to maintain order integrity
        order.total_amount += (item.unit_price * quantity_diff)
        order.save()

        # Create audit trail
        InventoryLog.objects.create(
            product=product, 
            product_name=product.name,  # Store for audit trail
            change_type=change_type, 
            quantity_change=-quantity_diff, 
            reason=f'Order {order.order_number} item edit'
        )
        OrderActivity.objects.create(order=order, activity_type="Order Item Updated", description=activity_desc)

        # Update or remove the item
        if new_quantity == 0:
            item.delete()  # Complete removal
        else:
            item.quantity = new_quantity
            item.save()

        return Response({'message': 'Order item updated successfully', 'order': self.get_serializer(order).data})


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing OrderItem instances.
    """
    queryset = OrderItem.objects.all().select_related('order', 'product')
    serializer_class = OrderItemSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production


class InventoryLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing InventoryLog instances.
    Read-only - logs cannot be modified directly.
    
    Note: Logs are preserved even after product deletion.
    """
    queryset = InventoryLog.objects.all()  # No select_related needed, uses stored product_name
    serializer_class = InventoryLogSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production


@api_view(['GET'])
def dashboard_statistics(request):
    """
    Dashboard statistics endpoint for business intelligence.
    
    Returns:
    - total_orders: Count of ALL orders (pending, confirmed, cancelled)
    - total_revenue: Sum of confirmed orders only (excludes pending/cancelled)
    - low_stock_products: Products below reorder threshold (< 10 units)
    
    Business Rules:
    - Revenue only counts confirmed orders (actual sales)
    - Low stock threshold set at 10 units (configurable)
    
    API Endpoint: GET /api/dashboard/
    """
    # Count all orders regardless of status
    total_orders = Order.objects.count()
    
    # Calculate revenue: ONLY confirmed orders count as actual sales
    # Pending orders are not guaranteed, cancelled orders are refunded
    revenue_aggregate = Order.objects.filter(status='confirmed').aggregate(
        total=Sum('total_amount')
    )
    total_revenue = float(revenue_aggregate['total'] or 0)  # Handle None if no confirmed orders
    
    # Alert for products needing restock (threshold: 10 units)
    low_stock_products = Product.objects.filter(stock_quantity__lt=10).values(
        'id', 'name', 'stock_quantity', 'price'
    )
    
    return Response({
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'low_stock_products': list(low_stock_products)
    })


@api_view(['GET'])
def unified_activity_log(request):
    """
    Unified activity timeline combining inventory and order events.
    
    Purpose:
    - Provides complete audit trail for compliance and debugging
    - Combines two separate log tables into single chronological view
    - Useful for tracking: "What happened to this product?" or "What changed in this order?"
    
    Response Format:
    [
      {
        log_type: 'inventory' | 'order',
        timestamp: datetime,
        id: unique identifier,
        details: { ... specific to log type ... }
      }
    ]
    
    API Endpoint: GET /api/activity-log/
    """
    # Fetch all logs with related objects (prevents N+1 query problem)
    inventory_logs = InventoryLog.objects.all()  # No select_related needed, uses stored product_name
    order_activities = OrderActivity.objects.all().select_related('order')

    # Normalize different log types into common format
    combined_log = []
    
    # Add inventory changes (stock additions/deductions)
    for log in inventory_logs:
        combined_log.append({
            'log_type': 'inventory',
            'timestamp': log.created_at,
            'id': f"inv-{log.id}",  # Prefix prevents ID collision with order logs
            'details': {
                'product_name': log.product_name,  # Uses stored name (preserved even if product deleted)
                'change_type': log.change_type,
                'quantity_change': log.quantity_change,
                'reason': log.reason,
            }
        })

    # Add order activities (created, confirmed, cancelled)
    for activity in order_activities:
        combined_log.append({
            'log_type': 'order',
            'timestamp': activity.timestamp,
            'id': f"ord-{activity.id}",  # Prefix prevents ID collision with inventory logs
            'details': {
                'order_number': activity.order.order_number,
                'activity_type': activity.activity_type,
                'description': activity.description,
            }
        })

    # Sort chronologically (newest first) - Python sort is stable and efficient
    sorted_log = sorted(combined_log, key=lambda x: x['timestamp'], reverse=True)

    return Response(sorted_log)
