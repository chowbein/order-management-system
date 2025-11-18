from django.db import models

class Product(models.Model):
    """Product model for inventory management"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Order(models.Model):
    """Order model for customer orders"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]

    order_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number}"


class OrderItem(models.Model):
    """OrderItem model linking orders to products"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in Order {self.order.order_number}"


class InventoryLog(models.Model):
    """InventoryLog model for tracking inventory changes"""
    CHANGE_TYPE_CHOICES = [
        ('addition', 'Addition'),
        ('deduction', 'Deduction'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_logs')
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    quantity_change = models.IntegerField()  # Can be positive or negative
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.change_type} of {abs(self.quantity_change)} for {self.product.name}"
