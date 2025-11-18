from rest_framework import serializers
from .models import Product, Order, OrderItem, InventoryLog


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for the Product model"""
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock_quantity', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for the OrderItem model"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'order', 'product', 'product_name', 'quantity', 'unit_price']
        read_only_fields = ['id', 'product_name']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for the Order model"""
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'order_number', 'status', 'total_amount', 'created_at', 'items']
        read_only_fields = ['id', 'created_at']


class InventoryLogSerializer(serializers.ModelSerializer):
    """Serializer for the InventoryLog model"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = InventoryLog
        fields = ['id', 'product', 'product_name', 'change_type', 'quantity_change', 'reason', 'created_at']
        read_only_fields = ['id', 'created_at']

