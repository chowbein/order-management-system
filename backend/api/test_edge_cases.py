"""
Edge case and concurrent operation tests for the Order Management System.
Tests cover race conditions, transaction rollbacks, and boundary conditions.
"""
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.db import transaction
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from threading import Thread
import time
from .models import Product, Order, OrderItem, InventoryLog


class ConcurrentOrderTest(TransactionTestCase):
    """
    Test cases for concurrent operations.
    Using TransactionTestCase because we need to test actual database transactions.
    """

    def test_concurrent_orders_dont_oversell(self):
        """
        Critical test: Two orders attempting to buy the last item should not both succeed.
        This tests the database locking mechanism (select_for_update).
        """
        # Create a product with only 1 item in stock
        product = Product.objects.create(
            name="Limited Edition Item",
            price=Decimal("99.99"),
            stock_quantity=1
        )
        
        # Create two pending orders for the same product
        order1 = Order.objects.create(
            order_number="CONCURRENT-001",
            status="pending",
            total_amount=Decimal("99.99")
        )
        OrderItem.objects.create(
            order=order1,
            product=product,
            quantity=1,
            unit_price=product.price
        )
        
        order2 = Order.objects.create(
            order_number="CONCURRENT-002",
            status="pending",
            total_amount=Decimal("99.99")
        )
        OrderItem.objects.create(
            order=order2,
            product=product,
            quantity=1,
            unit_price=product.price
        )
        
        results = {'responses': []}
        
        def confirm_order(order_id):
            """Helper function to confirm an order in a separate thread"""
            client = APIClient()
            url = reverse('order-confirm', args=[order_id])
            try:
                response = client.post(url)
                results['responses'].append({
                    'order_id': order_id,
                    'status_code': response.status_code,
                    'data': response.data
                })
            except Exception as e:
                results['responses'].append({
                    'order_id': order_id,
                    'error': str(e)
                })
        
        # Try to confirm both orders simultaneously
        thread1 = Thread(target=confirm_order, args=(order1.id,))
        thread2 = Thread(target=confirm_order, args=(order2.id,))
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Check results
        status_codes = [r['status_code'] for r in results['responses'] if 'status_code' in r]
        
        # One should succeed (200), one should fail (400)
        self.assertEqual(len(status_codes), 2)
        self.assertIn(status.HTTP_200_OK, status_codes)
        self.assertIn(status.HTTP_400_BAD_REQUEST, status_codes)
        
        # Verify stock is 0 (only one order succeeded)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)
        
        # Verify one order is confirmed, one is still pending
        order1.refresh_from_db()
        order2.refresh_from_db()
        
        statuses = {order1.status, order2.status}
        self.assertEqual(statuses, {'confirmed', 'pending'})

    def test_concurrent_stock_updates_dont_cause_negative_stock(self):
        """Test that concurrent stock updates don't result in negative stock"""
        product = Product.objects.create(
            name="Concurrent Update Product",
            price=Decimal("50.00"),
            stock_quantity=10
        )
        
        # Create 3 orders each wanting 5 items (total 15, but only 10 available)
        orders = []
        for i in range(3):
            order = Order.objects.create(
                order_number=f"CONCURRENT-{i}",
                status="pending",
                total_amount=Decimal("250.00")
            )
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=5,
                unit_price=product.price
            )
            orders.append(order)
        
        results = {'responses': []}
        
        def confirm_order(order_id):
            client = APIClient()
            url = reverse('order-confirm', args=[order_id])
            response = client.post(url)
            results['responses'].append(response.status_code)
        
        # Try to confirm all three orders simultaneously
        threads = [Thread(target=confirm_order, args=(o.id,)) for o in orders]
        
        for t in threads:
            t.start()
        
        for t in threads:
            t.join()
        
        # At most 2 orders should succeed (5 + 5 = 10)
        success_count = results['responses'].count(status.HTTP_200_OK)
        self.assertLessEqual(success_count, 2)
        
        # Stock should not be negative
        product.refresh_from_db()
        self.assertGreaterEqual(product.stock_quantity, 0)


class BoundaryConditionTest(TestCase):
    """Test cases for boundary conditions and edge values"""

    def setUp(self):
        self.client = APIClient()

    def test_order_with_zero_quantity(self):
        """Test that order items with zero quantity are rejected"""
        product = Product.objects.create(
            name="Test Product",
            price=Decimal("50.00"),
            stock_quantity=100
        )
        
        order = Order.objects.create(
            order_number="ZERO-QTY",
            status="pending",
            total_amount=Decimal("0.00")
        )
        
        # Try to create an order item with zero quantity
        # This should be prevented at the model level (PositiveIntegerField)
        with self.assertRaises(Exception):
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=0,
                unit_price=product.price
            )

    def test_product_with_zero_price(self):
        """Test handling of products with zero price"""
        url = reverse('product-list')
        data = {
            'name': 'Zero Price Product',
            'price': '0.00',
            'stock_quantity': 10
        }
        
        response = self.client.post(url, data, format='json')
        
        # This should be allowed (free products), but you might want to add validation
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_order_with_very_large_quantity(self):
        """Test order with extremely large quantity"""
        product = Product.objects.create(
            name="Test Product",
            price=Decimal("10.00"),
            stock_quantity=100
        )
        
        order = Order.objects.create(
            order_number="LARGE-QTY",
            status="pending",
            total_amount=Decimal("999999.99")
        )
        
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=99999,
            unit_price=product.price
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        # Should fail due to insufficient stock
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_product_with_very_large_stock(self):
        """Test that products can have very large stock quantities"""
        product = Product.objects.create(
            name="Large Stock Product",
            price=Decimal("5.00"),
            stock_quantity=999999
        )
        
        self.assertEqual(product.stock_quantity, 999999)

    def test_exact_stock_quantity_match(self):
        """Test ordering exactly the available stock quantity"""
        product = Product.objects.create(
            name="Exact Stock",
            price=Decimal("25.00"),
            stock_quantity=10
        )
        
        order = Order.objects.create(
            order_number="EXACT-MATCH",
            status="pending",
            total_amount=Decimal("250.00")
        )
        
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=10,  # Exactly matches stock
            unit_price=product.price
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        # Should succeed
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Stock should be exactly 0
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)

    def test_order_one_more_than_stock(self):
        """Test ordering one more item than available stock"""
        product = Product.objects.create(
            name="Almost Enough",
            price=Decimal("30.00"),
            stock_quantity=10
        )
        
        order = Order.objects.create(
            order_number="ONE-TOO-MANY",
            status="pending",
            total_amount=Decimal("330.00")
        )
        
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=11,  # One more than available
            unit_price=product.price
        )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        # Should fail
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Stock should remain unchanged
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 10)


class TransactionRollbackTest(TransactionTestCase):
    """Test cases for transaction rollback scenarios"""

    def test_order_confirmation_rolls_back_on_error(self):
        """
        Test that if order confirmation fails midway, all changes are rolled back.
        This is a critical test for data integrity.
        """
        # Create products
        product1 = Product.objects.create(
            name="Product 1",
            price=Decimal("50.00"),
            stock_quantity=10
        )
        product2 = Product.objects.create(
            name="Product 2",
            price=Decimal("30.00"),
            stock_quantity=5
        )
        
        # Create order with two items
        order = Order.objects.create(
            order_number="ROLLBACK-TEST",
            status="pending",
            total_amount=Decimal("150.00")
        )
        
        OrderItem.objects.create(
            order=order,
            product=product1,
            quantity=2,
            unit_price=product1.price
        )
        
        # Second item requests more than available
        OrderItem.objects.create(
            order=order,
            product=product2,
            quantity=10,  # More than available (5)
            unit_price=product2.price
        )
        
        initial_stock1 = product1.stock_quantity
        initial_stock2 = product2.stock_quantity
        
        client = APIClient()
        url = reverse('order-confirm', args=[order.id])
        response = client.post(url)
        
        # Should fail
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # CRITICAL: Both products' stock should remain unchanged
        product1.refresh_from_db()
        product2.refresh_from_db()
        
        self.assertEqual(product1.stock_quantity, initial_stock1)
        self.assertEqual(product2.stock_quantity, initial_stock2)
        
        # Order should still be pending
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')


class MultipleItemOrderTest(TestCase):
    """Test cases for orders with multiple items"""

    def setUp(self):
        self.client = APIClient()

    def test_order_with_multiple_different_products(self):
        """Test confirming an order with multiple different products"""
        products = []
        for i in range(5):
            product = Product.objects.create(
                name=f"Product {i}",
                price=Decimal(f"{10 * (i + 1)}.00"),
                stock_quantity=50
            )
            products.append(product)
        
        order = Order.objects.create(
            order_number="MULTI-ITEM",
            status="pending",
            total_amount=Decimal("150.00")
        )
        
        # Add multiple items to order
        for product in products:
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=2,
                unit_price=product.price
            )
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify all products had stock deducted
        for product in products:
            product.refresh_from_db()
            self.assertEqual(product.stock_quantity, 48)  # 50 - 2

    def test_order_with_one_out_of_stock_item_fails_completely(self):
        """Test that if one item is out of stock, the entire order fails"""
        product1 = Product.objects.create(
            name="Available Product",
            price=Decimal("50.00"),
            stock_quantity=100
        )
        product2 = Product.objects.create(
            name="Limited Product",
            price=Decimal("75.00"),
            stock_quantity=1
        )
        
        order = Order.objects.create(
            order_number="PARTIAL-STOCK",
            status="pending",
            total_amount=Decimal("250.00")
        )
        
        OrderItem.objects.create(
            order=order,
            product=product1,
            quantity=2,  # Available
            unit_price=product1.price
        )
        
        OrderItem.objects.create(
            order=order,
            product=product2,
            quantity=5,  # NOT available (only 1 in stock)
            unit_price=product2.price
        )
        
        initial_stock1 = product1.stock_quantity
        initial_stock2 = product2.stock_quantity
        
        url = reverse('order-confirm', args=[order.id])
        response = self.client.post(url)
        
        # Should fail
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # CRITICAL: No stock should be deducted from either product
        product1.refresh_from_db()
        product2.refresh_from_db()
        
        self.assertEqual(product1.stock_quantity, initial_stock1)
        self.assertEqual(product2.stock_quantity, initial_stock2)


class DataIntegrityTest(TestCase):
    """Test cases for data integrity and consistency"""

    def setUp(self):
        self.client = APIClient()

    def test_inventory_log_created_for_every_stock_change(self):
        """Test that every stock change creates an inventory log"""
        product = Product.objects.create(
            name="Logged Product",
            price=Decimal("25.00"),
            stock_quantity=50
        )
        
        # Count logs after creation
        initial_log_count = InventoryLog.objects.filter(product=product).count()
        self.assertGreater(initial_log_count, 0)  # Creation log
        
        # Update stock
        url = reverse('product-detail', args=[product.id])
        data = {
            'name': product.name,
            'price': str(product.price),
            'stock_quantity': 60
        }
        self.client.put(url, data, format='json')
        
        # Should have one more log
        new_log_count = InventoryLog.objects.filter(product=product).count()
        self.assertEqual(new_log_count, initial_log_count + 1)

    def test_order_total_matches_sum_of_items(self):
        """Test that order total amount matches the sum of its items"""
        product1 = Product.objects.create(
            name="Item 1",
            price=Decimal("25.00"),
            stock_quantity=100
        )
        product2 = Product.objects.create(
            name="Item 2",
            price=Decimal("35.00"),
            stock_quantity=100
        )
        
        # Calculate correct total
        item1_total = product1.price * 2  # 50
        item2_total = product2.price * 3  # 105
        expected_total = item1_total + item2_total  # 155
        
        order = Order.objects.create(
            order_number="TOTAL-CHECK",
            status="pending",
            total_amount=expected_total
        )
        
        OrderItem.objects.create(
            order=order,
            product=product1,
            quantity=2,
            unit_price=product1.price
        )
        
        OrderItem.objects.create(
            order=order,
            product=product2,
            quantity=3,
            unit_price=product2.price
        )
        
        # Calculate actual total from items
        items = order.items.all()
        actual_total = sum(item.quantity * item.unit_price for item in items)
        
        self.assertEqual(actual_total, expected_total)
        self.assertEqual(actual_total, order.total_amount)

    def test_cancelled_order_activity_logged(self):
        """Test that cancelling an order creates an activity log"""
        order = Order.objects.create(
            order_number="CANCEL-LOG",
            status="pending",
            total_amount=Decimal("50.00")
        )
        
        initial_activity_count = order.activities.count()
        
        url = reverse('order-cancel', args=[order.id])
        self.client.post(url)
        
        # Should have created a cancellation activity
        new_activity_count = order.activities.count()
        self.assertGreater(new_activity_count, initial_activity_count)
        
        # Check that the activity is a cancellation
        latest_activity = order.activities.first()
        self.assertIn('cancel', latest_activity.activity_type.lower())


class EmptyAndNullTest(TestCase):
    """Test cases for empty values and null handling"""

    def test_product_with_empty_description(self):
        """Test that products can have empty descriptions"""
        product = Product.objects.create(
            name="No Description",
            description="",  # Empty string
            price=Decimal("10.00"),
            stock_quantity=5
        )
        
        self.assertEqual(product.description, "")

    def test_inventory_log_with_empty_reason(self):
        """Test that inventory logs can have empty reasons"""
        product = Product.objects.create(
            name="Test",
            price=Decimal("10.00"),
            stock_quantity=5
        )
        
        log = InventoryLog.objects.create(
            product=product,
            change_type='addition',
            quantity_change=5,
            reason=""  # Empty reason
        )
        
        self.assertEqual(log.reason, "")

    def test_order_with_no_items(self):
        """Test behavior of order with no items"""
        order = Order.objects.create(
            order_number="EMPTY-ORDER",
            status="pending",
            total_amount=Decimal("0.00")
        )
        
        # Try to confirm order with no items
        client = APIClient()
        url = reverse('order-confirm', args=[order.id])
        response = client.post(url)
        
        # Should still succeed (no items to process)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Order should be confirmed
        order.refresh_from_db()
        self.assertEqual(order.status, 'confirmed')

