from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.db.models import Sum, Q
from .models import Product, Order, OrderItem, InventoryLog
from .serializers import ProductSerializer, OrderSerializer, OrderItemSerializer, InventoryLogSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Product instances.
    Provides CRUD operations: Create, Read, Update, Delete
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Order instances.
    Includes custom action for confirming orders.
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production

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

        # Get all order items
        order_items = OrderItem.objects.filter(order=order).select_related('product')

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
        - Increases stock quantity for each product in the order (restores inventory)
        - Creates inventory log entries
        - Updates order status to 'cancelled'
        """
        order = self.get_object()

        # Check if order is already cancelled
        if order.status == 'cancelled':
            return Response(
                {'error': 'Order is already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all order items
        order_items = OrderItem.objects.filter(order=order).select_related('product')

        # Process each order item
        for item in order_items:
            # Increase stock quantity (restore inventory)
            item.product.stock_quantity += item.quantity
            item.product.save()

            # Create inventory log entry
            InventoryLog.objects.create(
                product=item.product,
                change_type='addition',
                quantity_change=item.quantity,
                reason=f'Order {order.order_number} cancelled'
            )

        # Update order status
        order.status = 'cancelled'
        order.save()

        # Serialize and return the updated order
        serializer = self.get_serializer(order)
        return Response(
            {
                'message': 'Order cancelled successfully',
                'order': serializer.data
            },
            status=status.HTTP_200_OK
        )


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
