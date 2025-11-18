from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Product instances.
    Provides CRUD operations: Create, Read, Update, Delete
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]  # Change this to appropriate permissions in production
