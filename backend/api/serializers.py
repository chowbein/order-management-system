from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for the Product model"""
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock_quantity', 'created_at']
        read_only_fields = ['id', 'created_at']

