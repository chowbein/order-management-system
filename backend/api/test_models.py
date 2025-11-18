"""
Tests for Django models in the Order Management System.
Tests cover Product, Order, OrderItem, InventoryLog, and OrderActivity models.
"""
from django.test import TestCase
from django.db import IntegrityError
from decimal import Decimal
from .models import Product, Order, OrderItem, InventoryLog, OrderActivity


class ProductModelTest(TestCase):
    """Test cases for the Product model"""

    def test_create_product(self):
        """Test creating a product with all fields"""
        product = Product.objects.create(
            name="Test Keyboard",
            description="Mechanical keyboard with RGB",
            price=Decimal("99.99"),
            stock_quantity=50
        )
        
        self.assertEqual(product.name, "Test Keyboard")
        self.assertEqual(product.description, "Mechanical keyboard with RGB")
        self.assertEqual(product.price, Decimal("99.99"))
        self.assertEqual(product.stock_quantity, 50)
        self.assertIsNotNone(product.created_at)

    def test_create_product_minimal_fields(self):
        """Test creating a product with minimal required fields"""
        product = Product.objects.create(
            name="Basic Product",
            price=Decimal("10.00"),
            stock_quantity=5
        )
        
        self.assertEqual(product.name, "Basic Product")
        self.assertEqual(product.description, "")  # Blank is allowed
        self.assertEqual(product.stock_quantity, 5)

    def test_product_string_representation(self):
        """Test the __str__ method of Product"""
        product = Product.objects.create(
            name="Test Mouse",
            price=Decimal("49.99"),
            stock_quantity=100
        )
        
        self.assertEqual(str(product), "Test Mouse")

    def test_product_ordering(self):
        """Test that products are ordered by created_at descending"""
        product1 = Product.objects.create(
            name="First Product",
            price=Decimal("10.00"),
            stock_quantity=10
        )
        product2 = Product.objects.create(
            name="Second Product",
            price=Decimal("20.00"),
            stock_quantity=20
        )
        
        products = Product.objects.all()
        # Most recent (product2) should be first
        self.assertEqual(products[0].id, product2.id)
        self.assertEqual(products[1].id, product1.id)

    def test_negative_stock_quantity_constraint(self):
        """Test that negative stock quantity violates database constraint"""
        product = Product.objects.create(
            name="Test Product",
            price=Decimal("10.00"),
            stock_quantity=10
        )
        
        # Try to set negative stock
        product.stock_quantity = -5
        
        # Should raise IntegrityError due to CheckConstraint
        with self.assertRaises(IntegrityError):
            product.save()

    def test_price_precision(self):
        """Test that price handles decimal precision correctly"""
        product = Product.objects.create(
            name="Precise Product",
            price=Decimal("99.99"),
            stock_quantity=1
        )
        
        self.assertEqual(product.price, Decimal("99.99"))
        # Test retrieval from database
        saved_product = Product.objects.get(id=product.id)
        self.assertEqual(saved_product.price, Decimal("99.99"))


class OrderModelTest(TestCase):
    """Test cases for the Order model"""

    def test_create_order(self):
        """Test creating an order with all fields"""
        order = Order.objects.create(
            order_number="TEST-001",
            status="pending",
            total_amount=Decimal("199.99")
        )
        
        self.assertEqual(order.order_number, "TEST-001")
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.total_amount, Decimal("199.99"))
        self.assertIsNotNone(order.created_at)

    def test_order_status_choices(self):
        """Test all valid order status values"""
        statuses = ['pending', 'confirmed', 'cancelled']
        
        for status in statuses:
            order = Order.objects.create(
                order_number=f"TEST-{status}",
                status=status,
                total_amount=Decimal("100.00")
            )
            self.assertEqual(order.status, status)

    def test_duplicate_order_number_not_allowed(self):
        """Test that duplicate order numbers are prevented by unique constraint"""
        Order.objects.create(
            order_number="DUPLICATE-001",
            status="pending",
            total_amount=Decimal("100.00")
        )
        
        # Try to create another order with the same order number
        with self.assertRaises(IntegrityError):
            Order.objects.create(
                order_number="DUPLICATE-001",
                status="pending",
                total_amount=Decimal("200.00")
            )

    def test_order_string_representation(self):
        """Test the __str__ method of Order"""
        order = Order.objects.create(
            order_number="TEST-STR-001",
            status="pending",
            total_amount=Decimal("50.00")
        )
        
        self.assertEqual(str(order), "Order TEST-STR-001")

    def test_order_default_status(self):
        """Test that order status defaults to 'pending'"""
        order = Order.objects.create(
            order_number="TEST-DEFAULT",
            total_amount=Decimal("50.00")
        )
        
        self.assertEqual(order.status, "pending")


class OrderItemModelTest(TestCase):
    """Test cases for the OrderItem model"""

    def setUp(self):
        """Set up test data"""
        self.product = Product.objects.create(
            name="Test Product",
            price=Decimal("50.00"),
            stock_quantity=100
        )
        
        self.order = Order.objects.create(
            order_number="TEST-ORDER-001",
            status="pending",
            total_amount=Decimal("100.00")
        )

    def test_create_order_item(self):
        """Test creating an order item"""
        order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            unit_price=Decimal("50.00")
        )
        
        self.assertEqual(order_item.order, self.order)
        self.assertEqual(order_item.product, self.product)
        self.assertEqual(order_item.quantity, 2)
        self.assertEqual(order_item.unit_price, Decimal("50.00"))

    def test_order_item_string_representation(self):
        """Test the __str__ method of OrderItem"""
        order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=3,
            unit_price=Decimal("50.00")
        )
        
        expected = f"3x {self.product.name} in Order {self.order.order_number}"
        self.assertEqual(str(order_item), expected)

    def test_order_item_cascade_delete(self):
        """Test that deleting an order deletes its items"""
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            unit_price=Decimal("50.00")
        )
        
        # Verify item exists
        self.assertEqual(OrderItem.objects.filter(order=self.order).count(), 1)
        
        # Delete the order
        self.order.delete()
        
        # Verify item is also deleted
        self.assertEqual(OrderItem.objects.filter(product=self.product).count(), 0)

    def test_multiple_items_per_order(self):
        """Test that an order can have multiple items"""
        product2 = Product.objects.create(
            name="Second Product",
            price=Decimal("30.00"),
            stock_quantity=50
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            unit_price=Decimal("50.00")
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=product2,
            quantity=2,
            unit_price=Decimal("30.00")
        )
        
        self.assertEqual(self.order.items.count(), 2)


class InventoryLogModelTest(TestCase):
    """Test cases for the InventoryLog model"""

    def setUp(self):
        """Set up test data"""
        self.product = Product.objects.create(
            name="Logged Product",
            price=Decimal("25.00"),
            stock_quantity=50
        )

    def test_create_inventory_log_addition(self):
        """Test creating an inventory log for addition"""
        log = InventoryLog.objects.create(
            product=self.product,
            product_name=self.product.name,  # Required for audit trail
            change_type='addition',
            quantity_change=10,
            reason='Stock replenishment'
        )
        
        self.assertEqual(log.product, self.product)
        self.assertEqual(log.product_name, self.product.name)
        self.assertEqual(log.change_type, 'addition')
        self.assertEqual(log.quantity_change, 10)
        self.assertEqual(log.reason, 'Stock replenishment')
        self.assertIsNotNone(log.created_at)

    def test_create_inventory_log_deduction(self):
        """Test creating an inventory log for deduction"""
        log = InventoryLog.objects.create(
            product=self.product,
            product_name=self.product.name,  # Required for audit trail
            change_type='deduction',
            quantity_change=-5,
            reason='Order confirmed'
        )
        
        self.assertEqual(log.change_type, 'deduction')
        self.assertEqual(log.quantity_change, -5)

    def test_inventory_log_string_representation(self):
        """Test the __str__ method of InventoryLog"""
        log = InventoryLog.objects.create(
            product=self.product,
            product_name=self.product.name,  # Required for audit trail
            change_type='addition',
            quantity_change=15,
            reason='Restock'
        )
        
        expected = f"addition of 15 for {self.product.name}"
        self.assertEqual(str(log), expected)

    def test_inventory_log_ordering(self):
        """Test that inventory logs are ordered by created_at descending"""
        log1 = InventoryLog.objects.create(
            product=self.product,
            product_name=self.product.name,  # Required for audit trail
            change_type='addition',
            quantity_change=10,
            reason='First'
        )
        
        log2 = InventoryLog.objects.create(
            product=self.product,
            product_name=self.product.name,  # Required for audit trail
            change_type='deduction',
            quantity_change=-5,
            reason='Second'
        )
        
        logs = InventoryLog.objects.all()
        # Most recent (log2) should be first
        self.assertEqual(logs[0].id, log2.id)
        self.assertEqual(logs[1].id, log1.id)

    def test_inventory_log_preserved_after_product_delete(self):
        """Test that deleting a product PRESERVES its inventory logs (audit trail)"""
        log = InventoryLog.objects.create(
            product=self.product,
            product_name=self.product.name,  # Stored for preservation
            change_type='addition',
            quantity_change=10,
            reason='Test'
        )
        
        product_name = self.product.name
        
        # Verify log exists
        self.assertEqual(InventoryLog.objects.filter(product=self.product).count(), 1)
        
        # Delete the product
        self.product.delete()
        
        # CRITICAL: Verify log is PRESERVED (not deleted)
        self.assertEqual(InventoryLog.objects.count(), 1)
        
        # Verify the log still has the product name
        log.refresh_from_db()
        self.assertEqual(log.product_name, product_name)
        self.assertIsNone(log.product)  # FK is now null


class OrderActivityModelTest(TestCase):
    """Test cases for the OrderActivity model"""

    def setUp(self):
        """Set up test data"""
        self.order = Order.objects.create(
            order_number="ACTIVITY-TEST-001",
            status="pending",
            total_amount=Decimal("75.00")
        )

    def test_create_order_activity(self):
        """Test creating an order activity log"""
        activity = OrderActivity.objects.create(
            order=self.order,
            activity_type="Order Created",
            description="Order was created with status 'pending'"
        )
        
        self.assertEqual(activity.order, self.order)
        self.assertEqual(activity.activity_type, "Order Created")
        self.assertEqual(activity.description, "Order was created with status 'pending'")
        self.assertIsNotNone(activity.timestamp)

    def test_order_activity_string_representation(self):
        """Test the __str__ method of OrderActivity"""
        activity = OrderActivity.objects.create(
            order=self.order,
            activity_type="Order Confirmed",
            description="Status changed"
        )
        
        expected = f"Order {self.order.order_number} - Order Confirmed"
        self.assertEqual(str(activity), expected)

    def test_order_activity_ordering(self):
        """Test that activities are ordered by timestamp descending"""
        activity1 = OrderActivity.objects.create(
            order=self.order,
            activity_type="First Activity",
            description="First"
        )
        
        activity2 = OrderActivity.objects.create(
            order=self.order,
            activity_type="Second Activity",
            description="Second"
        )
        
        activities = OrderActivity.objects.all()
        # Most recent (activity2) should be first
        self.assertEqual(activities[0].id, activity2.id)
        self.assertEqual(activities[1].id, activity1.id)

    def test_multiple_activities_per_order(self):
        """Test that an order can have multiple activities"""
        OrderActivity.objects.create(
            order=self.order,
            activity_type="Order Created",
            description="Created"
        )
        
        OrderActivity.objects.create(
            order=self.order,
            activity_type="Order Confirmed",
            description="Confirmed"
        )
        
        OrderActivity.objects.create(
            order=self.order,
            activity_type="Order Cancelled",
            description="Cancelled"
        )
        
        self.assertEqual(self.order.activities.count(), 3)

    def test_order_activity_cascade_delete(self):
        """Test that deleting an order deletes its activities"""
        OrderActivity.objects.create(
            order=self.order,
            activity_type="Test Activity",
            description="Test"
        )
        
        # Verify activity exists
        self.assertEqual(OrderActivity.objects.filter(order=self.order).count(), 1)
        
        # Delete the order
        self.order.delete()
        
        # Verify activity is also deleted
        self.assertEqual(OrderActivity.objects.count(), 0)

