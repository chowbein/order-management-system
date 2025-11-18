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
        product = serializer.save()
        InventoryLog.objects.create(
            product=product,
            change_type='addition',
            quantity_change=product.stock_quantity,
            reason='Product created'
        )

    def perform_update(self, serializer):
        original_product = self.get_object()
        original_quantity = original_product.stock_quantity
        
        updated_product = serializer.save()
        new_quantity = updated_product.stock_quantity
        
        quantity_diff = new_quantity - original_quantity
        
        if quantity_diff != 0:
            change_type = 'addition' if quantity_diff > 0 else 'deduction'
            InventoryLog.objects.create(
                product=updated_product,
                change_type=change_type,
                quantity_change=quantity_diff,
                reason='Stock manually updated'
            )

    def perform_destroy(self, instance):
        if instance.stock_quantity > 0:
            InventoryLog.objects.create(
                product=instance,
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
    @transaction.atomic
    def confirm(self, request, pk=None):
        """
        Custom action to confirm an order.
        - Decreases stock quantity for each product in the order
        - Creates inventory log entries
        - Updates order status to 'confirmed'
        - Validates sufficient stock before processing
        """
        order = self.get_object()

        # Check if order is already confirmed
        if order.status == 'confirmed':
            return Response(
                {'error': 'Order is already confirmed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if order is cancelled
        if order.status == 'cancelled':
            return Response(
                {'error': 'Cannot confirm a cancelled order'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Lock products to prevent race conditions before checking stock
        order_items = order.items.select_related('product').select_for_update(of=('product',))

        # First, validate that all products have sufficient stock
        for item in order_items:
            if item.product.stock_quantity < item.quantity:
                return Response(
                    {
                        'error': f'Insufficient stock for product "{item.product.name}". '
                                f'Available: {item.product.stock_quantity}, Required: {item.quantity}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Process each order item
        for item in order_items:
            # Decrease stock quantity
            item.product.stock_quantity -= item.quantity
            item.product.save()

            # Create inventory log entry
            InventoryLog.objects.create(
                product=item.product,
                change_type='deduction',
                quantity_change=-item.quantity,
                reason=f'Order {order.order_number} confirmed'
            )

        # Update order status
        order.status = 'confirmed'
        order.save()

        # Log this activity
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
    @transaction.atomic
    def cancel(self, request, pk=None):
        """
        Custom action to cancel an order.
        - Restores inventory ONLY if the order was 'confirmed'.
        - Updates order status to 'cancelled'.
        """
        order = self.get_object()

        if order.status == 'cancelled':
            return Response({'error': 'Order is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)

        # Only restore stock if the order was confirmed
        if order.status == 'confirmed':
            order_items = order.items.select_related('product')
            for item in order_items:
                # Restore stock quantity
                item.product.stock_quantity += item.quantity
                item.product.save()

                # Create inventory log for the restoration
                InventoryLog.objects.create(
                    product=item.product,
                    change_type='addition',
                    quantity_change=item.quantity,
                    reason=f'Order {order.order_number} cancelled (stock restored)'
                )

        # Update order status to 'cancelled' regardless
        order.status = 'cancelled'
        order.save()

        # Log this activity
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
    @transaction.atomic
    def update_item_quantity(self, request, pk=None):
        """
        Updates the quantity of an item in a confirmed order.
        Setting quantity to 0 will remove the item.
        Expects {'order_item_id': <id>, 'new_quantity': <int>}
        """
        order = self.get_object()
        item_id = request.data.get('order_item_id')
        new_quantity = request.data.get('new_quantity')

        if item_id is None or new_quantity is None:
            return Response({'error': 'order_item_id and new_quantity are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_quantity = int(new_quantity)
            if new_quantity < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'New quantity must be a non-negative integer'}, status=status.HTTP_400_BAD_REQUEST)

        if order.status != 'confirmed':
            return Response({'error': 'Only items from confirmed orders can be modified.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Lock the item and its product to prevent race conditions
            item = OrderItem.objects.select_related('product').select_for_update(of=('self', 'product')).get(id=item_id, order=order)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Order item not found.'}, status=status.HTTP_404_NOT_FOUND)

        product = item.product
        old_quantity = item.quantity
        quantity_diff = new_quantity - old_quantity

        if quantity_diff == 0:
            return Response({'message': 'No change in quantity', 'order': self.get_serializer(order).data})

        # --- Handle Quantity Increase ---
        if quantity_diff > 0:
            if product.stock_quantity < quantity_diff:
                return Response({'error': f'Insufficient stock for {product.name}. Only {product.stock_quantity} more available.'}, status=status.HTTP_400_BAD_REQUEST)
            product.stock_quantity -= quantity_diff
            change_type = 'deduction'
            activity_desc = f"Increased quantity of '{product.name}' by {quantity_diff}."
        
        # --- Handle Quantity Decrease ---
        else: # quantity_diff < 0
            product.stock_quantity += abs(quantity_diff)
            change_type = 'addition'
            activity_desc = f"Decreased quantity of '{product.name}' by {abs(quantity_diff)}."

        # Update product stock
        product.save()

        # Update order total
        order.total_amount += (item.unit_price * quantity_diff)
        order.save()

        # Create Logs
        InventoryLog.objects.create(product=product, change_type=change_type, quantity_change=-quantity_diff, reason=f'Order {order.order_number} item edit')
        OrderActivity.objects.create(order=order, activity_type="Order Item Updated", description=activity_desc)

        # Update or delete item
        if new_quantity == 0:
            item.delete()
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
    """
    queryset = InventoryLog.objects.all().select_related('product')
    serializer_class = InventoryLogSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production


@api_view(['GET'])
def dashboard_statistics(request):
    """
    Read-only API view that returns dashboard statistics:
    - total_orders: Total count of all orders
    - total_revenue: Sum of total_amount for confirmed orders
    - low_stock_products: List of products with stock_quantity < 10
    """
    # Get total number of orders
    total_orders = Order.objects.count()
    
    # Calculate total revenue from confirmed orders
    revenue_aggregate = Order.objects.filter(status='confirmed').aggregate(
        total=Sum('total_amount')
    )
    total_revenue = float(revenue_aggregate['total'] or 0)
    
    # Get products with low stock (below 10)
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
    Combines InventoryLog and OrderActivity into a single, sorted timeline.
    """
    inventory_logs = InventoryLog.objects.all().select_related('product')
    order_activities = OrderActivity.objects.all().select_related('order')

    # Add a 'log_type' to each item to differentiate on the frontend
    combined_log = []
    
    for log in inventory_logs:
        combined_log.append({
            'log_type': 'inventory',
            'timestamp': log.created_at,
            'id': f"inv-{log.id}",
            'details': {
                'product_name': log.product.name,
                'change_type': log.change_type,
                'quantity_change': log.quantity_change,
                'reason': log.reason,
            }
        })

    for activity in order_activities:
        combined_log.append({
            'log_type': 'order',
            'timestamp': activity.timestamp,
            'id': f"ord-{activity.id}",
            'details': {
                'order_number': activity.order.order_number,
                'activity_type': activity.activity_type,
                'description': activity.description,
            }
        })

    # Sort the combined log by timestamp, newest first
    sorted_log = sorted(combined_log, key=lambda x: x['timestamp'], reverse=True)

    return Response(sorted_log)
