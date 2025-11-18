import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderForm = ({ onOrderCreated }) => {
    const [products, setProducts] = useState([]);
    const [orderItems, setOrderItems] = useState([{ product: '', quantity: 1, price: 0 }]);
    const [orderNumber, setOrderNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/products/');
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
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validate
        if (!orderNumber.trim()) {
            setError('Please enter an order number');
            setLoading(false);
            return;
        }

        const validItems = orderItems.filter(item => item.product && item.quantity > 0);
        if (validItems.length === 0) {
            setError('Please add at least one item to the order');
            setLoading(false);
            return;
        }

        try {
            // Create the order
            const orderData = {
                order_number: orderNumber,
                status: 'pending',
                total_amount: calculateTotal()
            };
            const orderResponse = await axios.post('http://localhost:8000/api/orders/', orderData);
            const orderId = orderResponse.data.id;

            // Create order items
            for (const item of validItems) {
                await axios.post('http://localhost:8000/api/order-items/', {
                    order: orderId,
                    product: item.product,
                    quantity: item.quantity,
                    unit_price: item.price
                });
            }

            setSuccess(true);
            setOrderNumber('');
            setOrderItems([{ product: '', quantity: 1, price: 0 }]);
            
            if (onOrderCreated) {
                onOrderCreated(orderId);
            }

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error creating order:', err);
            setError(err.response?.data?.detail || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px' }}>
            <h2>Create New Order</h2>
            
            {error && (
                <div style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '15px', borderRadius: '4px' }}>
                    {error}
                </div>
            )}
            
            {success && (
                <div style={{ padding: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32', marginBottom: '15px', borderRadius: '4px' }}>
                    Order created successfully!
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Order Number:
                    </label>
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        style={{ padding: '8px', width: '100%', maxWidth: '300px', fontSize: '14px' }}
                        placeholder="e.g., ORD-001"
                        required
                    />
                </div>

                <h3>Order Items</h3>
                {orderItems.map((item, index) => (
                    <div key={index} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1', minWidth: '200px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Product:</label>
                                <select
                                    value={item.product}
                                    onChange={(e) => updateOrderItem(index, 'product', e.target.value)}
                                    style={{ padding: '8px', width: '100%', fontSize: '14px' }}
                                    required
                                >
                                    <option value="">Select a product</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} (${product.price}) - Stock: {product.stock_quantity}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{ width: '120px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Quantity:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                    style={{ padding: '8px', width: '100%', fontSize: '14px' }}
                                    required
                                />
                            </div>
                            
                            <div style={{ width: '120px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Price:</label>
                                <input
                                    type="text"
                                    value={`$${item.price}`}
                                    readOnly
                                    style={{ padding: '8px', width: '100%', fontSize: '14px', backgroundColor: '#f5f5f5' }}
                                />
                            </div>

                            <div style={{ width: '120px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Subtotal:</label>
                                <input
                                    type="text"
                                    value={`$${(item.price * item.quantity).toFixed(2)}`}
                                    readOnly
                                    style={{ padding: '8px', width: '100%', fontSize: '14px', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}
                                />
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => removeOrderItem(index)}
                                disabled={orderItems.length === 1}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: orderItems.length === 1 ? 'not-allowed' : 'pointer',
                                    opacity: orderItems.length === 1 ? 0.5 : 1,
                                    marginTop: '20px'
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addOrderItem}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '20px'
                    }}
                >
                    + Add Item
                </button>

                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>Total: ${calculateTotal()}</h3>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '12px 30px',
                        backgroundColor: loading ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginTop: '20px'
                    }}
                >
                    {loading ? 'Creating Order...' : 'Create Order'}
                </button>
            </form>
        </div>
    );
};

export default OrderForm;

