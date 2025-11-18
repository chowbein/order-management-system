from django.db import models
from django.db.models import CheckConstraint, Q

class Product(models.Model):
    """
    Product model for inventory management.
    
    Tracks product information and current stock levels.
    Changes to stock_quantity are automatically logged via InventoryLog.
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Up to 99,999,999.99
    stock_quantity = models.PositiveIntegerField(default=0)  # Cannot be negative
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # Newest products first
        constraints = [
            # Database-level constraint: prevents negative stock at DB level
            # This is a safety net beyond model validation
            CheckConstraint(check=Q(stock_quantity__gte=0), name='stock_quantity_non_negative')
        ]

    def __str__(self):
        return self.name


class Order(models.Model):
    """
    Order model for customer orders.
    
    Order Lifecycle:
    1. 'pending' - Created but not confirmed (no stock deducted yet)
    2. 'confirmed' - Stock deducted, order locked in
    3. 'cancelled' - Order cancelled (stock restored if was confirmed)
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),      # Initial state
        ('confirmed', 'Confirmed'),  # Stock deducted
        ('cancelled', 'Cancelled'),  # Order void
    ]

    order_number = models.CharField(max_length=50, unique=True)  # Business identifier
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Calculated from items
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # Newest orders first

    def __str__(self):
        return f"Order {self.order_number}"


class OrderItem(models.Model):
    """
    OrderItem model linking orders to products (many-to-many through table).
    
    Captures product details at time of order to preserve pricing history.
    unit_price is stored separately from Product.price to handle price changes.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)  # Reference to product
    quantity = models.PositiveIntegerField()  # How many of this product
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at order time

    class Meta:
        ordering = ['order', 'id']  # Group by order, then by creation

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in Order {self.order.order_number}"


class InventoryLog(models.Model):
    """
    InventoryLog model for tracking inventory changes (audit trail).
    
    Every stock change is logged for:
    - Compliance and auditing
    - Debugging inventory discrepancies
    - Business intelligence
    
    Important: Logs are preserved even if the product is deleted.
    - product_name is stored for historical reference
    - product FK uses SET_NULL so logs remain after product deletion
    
    quantity_change can be positive (addition) or negative (deduction).
    """
    CHANGE_TYPE_CHOICES = [
        ('addition', 'Addition'),    # Stock increased
        ('deduction', 'Deduction'),  # Stock decreased
    ]

    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_logs')
    product_name = models.CharField(max_length=200, default='Unknown Product')  # Denormalized for audit trail preservation
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    quantity_change = models.IntegerField()  # Positive or negative delta
    reason = models.CharField(max_length=255, blank=True)  # Why the change happened
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # Newest changes first

    def __str__(self):
        return f"{self.change_type} of {abs(self.quantity_change)} for {self.product_name}"


class OrderActivity(models.Model):
    """
    Log for order status changes and modifications (audit trail).
    
    Tracks all order-related events:
    - Order Created, Confirmed, Cancelled
    - Item additions, removals, quantity changes
    
    Combined with InventoryLog in unified activity feed for complete audit trail.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50)  # e.g., 'Order Created', 'Order Confirmed'
    description = models.TextField()  # Human-readable description of what happened
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']  # Newest activities first

    def __str__(self):
        return f"Order {self.order.order_number} - {self.activity_type}"
