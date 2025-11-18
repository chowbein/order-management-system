import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import './OrderForm.css';

const OrderForm = ({ onOrderCreated }) => {
    const [products, setProducts] = useState([]);
    const [orderItems, setOrderItems] = useState([{ product: '', quantity: 1, price: 0 }]);
    const [orderNumber, setOrderNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/products/`);
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products');
        }
    };

    const addOrderItem = () => {
        setOrderItems([...orderItems, { product: '', quantity: 1, price: 0 }]);
    };

    const removeOrderItem = (index) => {
        const newItems = orderItems.filter((_, i) => i !== index);
        setOrderItems(newItems);
    };

    const updateOrderItem = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;

        // Update price when product is selected
        if (field === 'product') {
            const selectedProduct = products.find(p => p.id === parseInt(value));
            if (selectedProduct) {
                newItems[index].price = selectedProduct.price;
            }
        }

        setOrderItems(newItems);
    };

    const calculateTotal = () => {
        return orderItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0).toFixed(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Comprehensive validation
        if (!orderNumber.trim()) {
            setError('Please enter an order number');
            setLoading(false);
            return;
        }

        // Validate order items
        const validItems = orderItems.filter(item => item.product && item.quantity > 0);
        if (validItems.length === 0) {
            setError('Please add at least one item with a quantity greater than 0');
            setLoading(false);
            return;
        }

        // Check if all items have valid products and prices
        for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i];
            if (!item.product) {
                setError(`Item ${i + 1}: Please select a product`);
                setLoading(false);
                return;
            }
            if (!item.quantity || item.quantity <= 0) {
                setError(`Item ${i + 1}: Quantity must be greater than 0`);
                setLoading(false);
                return;
            }
            if (!item.price || item.price <= 0) {
                setError(`Item ${i + 1}: Invalid price. Please select a valid product`);
                setLoading(false);
                return;
            }

            // Check stock availability
            const selectedProduct = products.find(p => p.id === parseInt(item.product));
            if (selectedProduct && selectedProduct.stock_quantity < item.quantity) {
                setError(`Item ${i + 1}: ${selectedProduct.name} only has ${selectedProduct.stock_quantity} units in stock`);
                setLoading(false);
                return;
            }
        }

        let createdOrderId = null;

        try {
            // Create the order
            const totalAmount = calculateTotal();
            if (!totalAmount || totalAmount <= 0) {
                setError('Order total must be greater than 0');
                setLoading(false);
                return;
            }

            const orderData = {
                order_number: orderNumber.trim(),
                status: 'pending',
                total_amount: totalAmount
            };

            const orderResponse = await axios.post(`${API_BASE_URL}/api/orders/`, orderData);
            createdOrderId = orderResponse.data.id;

            if (!createdOrderId) {
                throw new Error('Failed to get order ID from server');
            }

            // Create order items one by one
            for (let i = 0; i < validItems.length; i++) {
                const item = validItems[i];
                try {
                    await axios.post(`${API_BASE_URL}/api/order-items/`, {
                        order: createdOrderId,
                        product: parseInt(item.product),
                        quantity: parseInt(item.quantity),
                        unit_price: parseFloat(item.price)
                    });
                } catch (itemError) {
                    console.error(`Error creating order item ${i + 1}:`, itemError);
                    // If any item fails, try to delete the order (cleanup)
                    try {
                        await axios.delete(`${API_BASE_URL}/api/orders/${createdOrderId}/`);
                    } catch (deleteError) {
                        console.error('Failed to cleanup order:', deleteError);
                    }
                    throw new Error(`Failed to add item ${i + 1}: ${itemError.response?.data?.detail || itemError.message}`);
                }
            }

            setSuccess(true);
            setOrderNumber('');
            setOrderItems([{ product: '', quantity: 1, price: 0 }]);
            setSubmitted(false);
            
            if (onOrderCreated) {
                onOrderCreated(createdOrderId);
            }

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error creating order:', err);
            let errorMessage = 'Failed to create order';
            
            if (err.response?.data) {
                // Handle different error formats
                if (err.response.data.order_number) {
                    errorMessage = `Order Number: ${err.response.data.order_number[0]}`;
                } else if (err.response.data.detail) {
                    errorMessage = err.response.data.detail;
                } else if (err.response.data.error) {
                    errorMessage = err.response.data.error;
                } else if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="order-form-container">
            <h2>Create New Order</h2>
            
            {error && (
                <div className="of-message error">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="of-message success">
                    Order created successfully!
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="of-form-group">
                    <label>
                        Order Number: *
                    </label>
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="e.g., ORD-001"
                        required
                    />
                    <div className="field-hint">
                        Enter a unique order number
                    </div>
                </div>

                <div className="of-items-container">
                    <h3>Order Items</h3>
                    {orderItems.map((item, index) => (
                        <div key={index} className="of-item">
                            <div className="of-item-row">
                                <div className="of-item-field product-field">
                                    <label>Product:</label>
                                    <select
                                        value={item.product}
                                        onChange={(e) => updateOrderItem(index, 'product', e.target.value)}
                                        className={submitted && !item.product ? 'invalid' : ''}
                                        required
                                    >
                                        <option value="">Select a product</option>
                                        {products.map(product => (
                                            <option 
                                                key={product.id} 
                                                value={product.id}
                                                disabled={product.stock_quantity === 0}
                                            >
                                                {product.name} (₱{product.price}) - Stock: {product.stock_quantity}
                                                {product.stock_quantity === 0 ? ' - OUT OF STOCK' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {submitted && !item.product && (
                                        <div className="of-error-message">
                                            Product is required
                                        </div>
                                    )}
                                </div>
                                
                                <div className="of-item-field quantity-field">
                                    <label>Quantity:</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.quantity}
                                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                        className={item.quantity < 0 ? 'invalid' : ''}
                                        required
                                    />
                                    {item.quantity < 0 && (
                                        <div className="of-error-message">
                                            Cannot be negative
                                        </div>
                                    )}
                                </div>
                                
                                <div className="of-item-field price-field">
                                    <label>Price:</label>
                                    <input
                                        type="text"
                                        value={`₱${item.price}`}
                                        readOnly
                                    />
                                </div>

                                <div className="of-item-field subtotal-field">
                                    <label>Subtotal:</label>
                                    <input
                                        type="text"
                                        value={`₱${(item.price * item.quantity).toFixed(2)}`}
                                        readOnly
                                        style={{ fontWeight: 'bold' }}
                                    />
                                </div>
                                
                                <div className="of-item-actions">
                                    <button
                                        type="button"
                                        onClick={() => removeOrderItem(index)}
                                        disabled={orderItems.length === 1}
                                        className="of-remove-item-btn"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addOrderItem}
                        className="of-add-item-btn"
                    >
                        + Add Item
                    </button>
                </div>

                <div className="of-total-container">
                    <h3>Total: ₱{calculateTotal()}</h3>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="of-submit-btn"
                >
                    {loading ? 'Creating Order...' : 'Create Order'}
                </button>
            </form>
        </div>
    );
};

export default OrderForm;

