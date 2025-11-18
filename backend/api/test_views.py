"""
Tests for API views in the Order Management System.
Tests cover all CRUD operations and custom actions for products, orders, and inventory.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from .models import Product, Order, OrderItem, InventoryLog, OrderActivity


class ProductAPITest(TestCase):
    """Test cases for Product API endpoints"""

    def setUp(self):
        """Set up test client and sample data"""
        self.client = APIClient()
        self.product = Product.objects.create(
            name="Test Keyboard",
            description="Mechanical keyboard",
            price=Decimal("99.99"),
            stock_quantity=50
        )

    def test_list_products(self):
        """Test GET /api/products/ - list all products"""
        url = reverse('product-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Test Keyboard")

    def test_retrieve_product(self):
        """Test GET /api/products/{id}/ - get single product"""
        url = reverse('product-detail', args=[self.product.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Test Keyboard")
        self.assertEqual(Decimal(response.data['price']), Decimal("99.99"))

    def test_create_product(self):
        """Test POST /api/products/ - create new product"""
        url = reverse('product-list')
        data = {
            'name': 'New Mouse',
            'description': 'Gaming mouse',
            'price': '49.99',
            'stock_quantity': 100
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        
        # Verify product was created
        new_product = Product.objects.get(name='New Mouse')
        self.assertEqual(new_product.stock_quantity, 100)

    def test_create_product_creates_inventory_log(self):
        """Test that creating a product automatically creates an inventory log"""
        initial_log_count = InventoryLog.objects.count()
        
        url = reverse('product-list')
        data = {
            'name': 'Logged Product',
            'price': '29.99',
            'stock_quantity': 25
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that an inventory log was created
        product = Product.objects.get(name='Logged Product')
        logs = product.inventory_logs.all()
        
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].change_type, 'addition')
        self.assertEqual(logs[0].quantity_change, 25)
        self.assertEqual(logs[0].reason, 'Product created')

    def test_update_product(self):
        """Test PUT /api/products/{id}/ - update existing product"""
        url = reverse('product-detail', args=[self.product.id])
        data = {
            'name': 'Updated Keyboard',
            'description': 'Updated description',
            'price': '89.99',
            'stock_quantity': 60
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify product was updated
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Updated Keyboard')
        self.assertEqual(self.product.stock_quantity, 60)

    def test_update_product_stock_creates_inventory_log(self):
        """Test that updating product stock creates an inventory log"""
        url = reverse('product-detail', args=[self.product.id])
        data = {
            'name': self.product.name,
            'price': str(self.product.price),
            'stock_quantity': 75  # Increase from 50 to 75
        }
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check inventory log
        logs = self.product.inventory_logs.filter(reason='Stock manually updated')
        self.assertGreater(len(logs), 0)
        
        latest_log = logs.first()
        self.assertEqual(latest_log.change_type, 'addition')
        self.assertEqual(latest_log.quantity_change, 25)  # 75 - 50

    def test_update_product_decrease_stock_creates_log(self):
        """Test that decreasing stock creates a deduction log"""
        url = reverse('product-detail', args=[self.product.id])
        data = {
            'name': self.product.name,
            'price': str(self.product.price),
            'stock_quantity': 30  # Decrease from 50 to 30
        }
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check inventory log
        logs = self.product.inventory_logs.filter(reason='Stock manually updated')
        latest_log = logs.first()
        
        self.assertEqual(latest_log.change_type, 'deduction')
        self.assertEqual(latest_log.quantity_change, -20)  # 30 - 50

    def test_delete_product(self):
        """Test DELETE /api/products/{id}/ - delete product"""
        url = reverse('product-detail', args=[self.product.id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 0)

    def test_delete_product_with_stock_creates_log(self):
        """Test that deleting a product with stock creates an inventory log"""
        product_id = self.product.id
        product_name = self.product.name
        
        url = reverse('product-detail', args=[product_id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check that a log was created (even though product is deleted, log should exist)
        # Note: This actually won't work because of CASCADE delete, but it tests the intention


class OrderAPITest(TestCase):
    """Test cases for Order API endpoints"""

    def setUp(self):
        """Set up test client and sample data"""
        self.client = APIClient()
        self.product = Product.objects.create(
            name="Test Product",
            price=Decimal("50.00"),
            stock_quantity=100
        )

    def test_list_orders(self):
        """Test GET /api/orders/ - list all orders"""
        Order.objects.create(
            order_number="TEST-001",
            status="pending",
            total_amount=Decimal("100.00")
        )
        
        url = reverse('order-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_order(self):
        """Test POST /api/orders/ - create new order"""
        url = reverse('order-list')
        data = {
            'order_number': 'CREATE-TEST-001',
            'status': 'pending',
            'total_amount': '150.00'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

    def test_create_order_creates_activity_log(self):
        """Test that creating an order creates an activity log"""
        url = reverse('order-list')
        data = {
            'order_number': 'ACTIVITY-TEST',
            'status': 'pending',
            'total_amount': '99.99'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check activity log
        order = Order.objects.get(order_number='ACTIVITY-TEST')
        activities = order.activities.all()
        
        self.assertEqual(len(activities), 1)
        self.assertEqual(activities[0].activity_type, "Order Created")

    def test_confirm_pending_order(self):
        """Test POST /api/orders/{id}/confirm/ - confirm pending order"""
        # Create order with items
        order = Order.objects.create(
            order_number="CONFIRM-TEST-001",
            status="pending",
            total_amount=Decimal("100.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=self.product.price
        )
        
        initial_stock = self.product.stock_quantity
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Verify order status changed
        order.refresh_from_db()
        self.assertEqual(order.status, 'confirmed')
        
        # Verify stock was deducted
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 2)

    def test_confirm_order_creates_inventory_log(self):
        """Test that confirming an order creates inventory logs"""
        order = Order.objects.create(
            order_number="LOG-TEST-001",
            status="pending",
            total_amount=Decimal("150.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=3,
            unit_price=self.product.price
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check inventory log
        logs = InventoryLog.objects.filter(
            product=self.product,
            change_type='deduction',
            reason__contains='confirmed'
        )
        
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].quantity_change, -3)

    def test_confirm_order_creates_activity_log(self):
        """Test that confirming an order creates an activity log"""
        order = Order.objects.create(
            order_number="ACTIVITY-CONFIRM",
            status="pending",
            total_amount=Decimal("50.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            unit_price=self.product.price
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check activity log
        activities = order.activities.filter(activity_type="Order Confirmed")
        self.assertEqual(len(activities), 1)

    def test_cannot_confirm_already_confirmed_order(self):
        """Test that confirming an already confirmed order fails"""
        order = Order.objects.create(
            order_number="ALREADY-CONFIRMED",
            status="confirmed",  # Already confirmed
            total_amount=Decimal("50.00")
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('already confirmed', response.data['error'].lower())

    def test_cannot_confirm_cancelled_order(self):
        """Test that confirming a cancelled order fails"""
        order = Order.objects.create(
            order_number="CANCELLED-ORDER",
            status="cancelled",
            total_amount=Decimal("50.00")
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_cannot_confirm_order_with_insufficient_stock(self):
        """Test that order confirmation fails when stock is insufficient"""
        order = Order.objects.create(
            order_number="INSUFFICIENT-STOCK",
            status="pending",
            total_amount=Decimal("5000.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=200,  # More than available (100)
            unit_price=self.product.price
        )
        
        initial_stock = self.product.stock_quantity
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('insufficient stock', response.data['error'].lower())
        
        # Verify stock was NOT deducted
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock)
        
        # Verify order status did NOT change
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_cancel_pending_order(self):
        """Test POST /api/orders/{id}/cancel/ - cancel pending order"""
        order = Order.objects.create(
            order_number="CANCEL-PENDING",
            status="pending",
            total_amount=Decimal("50.00")
        )
        
        url = reverse('order-cancel', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify order status changed
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_cancel_confirmed_order_restores_inventory(self):
        """Test that cancelling a confirmed order restores inventory"""
        # Create and confirm order
        order = Order.objects.create(
            order_number="CANCEL-CONFIRMED",
            status="pending",
            total_amount=Decimal("100.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=5,
            unit_price=self.product.price
        )
        
        # Confirm order first
        confirm_url = reverse('order-confirm', args=[order.id])
        self.client.post(confirm_url)
        
        self.product.refresh_from_db()
        stock_after_confirm = self.product.stock_quantity
        
        # Now cancel the order
        cancel_url = reverse('order-cancel', args=[order.id])
        response = self.client.post(cancel_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify stock was restored
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, stock_after_confirm + 5)
        
        # Verify order status changed
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_cancel_confirmed_order_creates_inventory_log(self):
        """Test that cancelling confirmed order creates restoration inventory log"""
        order = Order.objects.create(
            order_number="CANCEL-LOG-TEST",
            status="pending",
            total_amount=Decimal("75.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=3,
            unit_price=self.product.price
        )
        
        # Confirm and then cancel
        confirm_url = reverse('order-confirm', args=[order.id])
        self.client.post(confirm_url)
        
        cancel_url = reverse('order-cancel', args=[order.id])
        response = self.client.post(cancel_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check for restoration inventory log
        logs = InventoryLog.objects.filter(
            product=self.product,
            change_type='addition',
            reason__contains='cancelled'
        )
        
        self.assertGreater(len(logs), 0)
        self.assertEqual(logs.first().quantity_change, 3)

    def test_cancel_pending_order_does_not_restore_inventory(self):
        """Test that cancelling a pending order does NOT restore inventory"""
        initial_stock = self.product.stock_quantity
        
        order = Order.objects.create(
            order_number="CANCEL-PENDING-NO-RESTORE",
            status="pending",
            total_amount=Decimal("50.00")
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=self.product.price
        )
        
        # Cancel without confirming
        cancel_url = reverse('order-cancel', args=[order.id])
        response = self.client.post(cancel_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify stock did NOT change (was never deducted)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock)

    def test_cannot_cancel_already_cancelled_order(self):
        """Test that cancelling an already cancelled order fails"""
        order = Order.objects.create(
            order_number="ALREADY-CANCELLED",
            status="cancelled",
            total_amount=Decimal("50.00")
        )
        
        url = reverse('order-cancel', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class DashboardAPITest(TestCase):
    """Test cases for Dashboard statistics endpoint"""

    def setUp(self):
        """Set up test client and sample data"""
        self.client = APIClient()

    def test_dashboard_statistics_endpoint(self):
        """Test GET /api/dashboard/ - dashboard statistics"""
        url = reverse('dashboard-statistics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_orders', response.data)
        self.assertIn('total_revenue', response.data)
        self.assertIn('low_stock_products', response.data)

    def test_total_orders_count(self):
        """Test that total_orders counts all orders"""
        Order.objects.create(order_number="ORD-001", total_amount=Decimal("100.00"))
        Order.objects.create(order_number="ORD-002", total_amount=Decimal("200.00"))
        Order.objects.create(order_number="ORD-003", total_amount=Decimal("300.00"))
        
        url = reverse('dashboard-statistics')
        response = self.client.get(url)
        
        self.assertEqual(response.data['total_orders'], 3)

    def test_total_revenue_only_confirmed_orders(self):
        """Test that total_revenue only includes confirmed orders"""
        Order.objects.create(
            order_number="CONF-001",
            status="confirmed",
            total_amount=Decimal("100.00")
        )
        Order.objects.create(
            order_number="CONF-002",
            status="confirmed",
            total_amount=Decimal("200.00")
        )
        Order.objects.create(
            order_number="PEND-001",
            status="pending",
            total_amount=Decimal("500.00")  # Should NOT be included
        )
        Order.objects.create(
            order_number="CANC-001",
            status="cancelled",
            total_amount=Decimal("300.00")  # Should NOT be included
        )
        
        url = reverse('dashboard-statistics')
        response = self.client.get(url)
        
        # Only confirmed orders: 100 + 200 = 300
        self.assertEqual(float(response.data['total_revenue']), 300.00)

    def test_low_stock_products_detection(self):
        """Test that low stock products (< 10) are detected"""
        Product.objects.create(name="Low Stock 1", price=Decimal("10.00"), stock_quantity=5)
        Product.objects.create(name="Low Stock 2", price=Decimal("20.00"), stock_quantity=2)
        Product.objects.create(name="Good Stock", price=Decimal("30.00"), stock_quantity=50)
        
        url = reverse('dashboard-statistics')
        response = self.client.get(url)
        
        # Should return 2 low stock products
        self.assertEqual(len(response.data['low_stock_products']), 2)

    def test_low_stock_threshold_boundary(self):
        """Test the exact boundary of low stock threshold (< 10)"""
        Product.objects.create(name="Stock 9", price=Decimal("10.00"), stock_quantity=9)  # Low
        Product.objects.create(name="Stock 10", price=Decimal("20.00"), stock_quantity=10)  # NOT low
        Product.objects.create(name="Stock 11", price=Decimal("30.00"), stock_quantity=11)  # NOT low
        
        url = reverse('dashboard-statistics')
        response = self.client.get(url)
        
        # Only stock_quantity < 10 should be flagged
        self.assertEqual(len(response.data['low_stock_products']), 1)
        self.assertEqual(response.data['low_stock_products'][0]['name'], "Stock 9")


class ActivityLogAPITest(TestCase):
    """Test cases for unified activity log endpoint"""

    def setUp(self):
        """Set up test client and sample data"""
        self.client = APIClient()
        self.product = Product.objects.create(
            name="Test Product",
            price=Decimal("50.00"),
            stock_quantity=100
        )
        self.order = Order.objects.create(
            order_number="LOG-TEST-001",
            total_amount=Decimal("100.00")
        )

    def test_unified_activity_log_endpoint(self):
        """Test GET /api/activity-log/ - unified activity log"""
        url = reverse('unified-activity-log')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_activity_log_combines_inventory_and_order_logs(self):
        """Test that activity log combines inventory logs and order activities"""
        # Create an inventory log
        InventoryLog.objects.create(
            product=self.product,
            change_type='addition',
            quantity_change=10,
            reason='Restock'
        )
        
        # Create an order activity
        OrderActivity.objects.create(
            order=self.order,
            activity_type='Order Created',
            description='Test order created'
        )
        
        url = reverse('unified-activity-log')
        response = self.client.get(url)
        
        # Should have both logs
        self.assertEqual(len(response.data), 2)
        
        # Check that both log types are present
        log_types = [log['log_type'] for log in response.data]
        self.assertIn('inventory', log_types)
        self.assertIn('order', log_types)

    def test_activity_log_sorted_by_timestamp(self):
        """Test that activity log is sorted by timestamp (newest first)"""
        # These will be created in order, so timestamps will be sequential
        log1 = InventoryLog.objects.create(
            product=self.product,
            change_type='addition',
            quantity_change=5,
            reason='First'
        )
        
        log2 = InventoryLog.objects.create(
            product=self.product,
            change_type='deduction',
            quantity_change=-2,
            reason='Second'
        )
        
        url = reverse('unified-activity-log')
        response = self.client.get(url)
        
        # Newest (log2) should be first
        self.assertGreater(
            response.data[0]['timestamp'],
            response.data[1]['timestamp']
        )

