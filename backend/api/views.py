from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction
from .models import Product, Order, OrderItem, InventoryLog
from .serializers import ProductSerializer, OrderSerializer


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
