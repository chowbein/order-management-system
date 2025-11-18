import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderDetails = ({ orderId }) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8000/api/orders/${orderId}/`);
            setOrder(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching order:', err);
            setError('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (window.confirm('Are you sure you want to confirm this order? This will deduct items from inventory.')) {
            setActionLoading(true);
            setMessage(null);
            try {
                const response = await axios.post(`http://localhost:8000/api/orders/${orderId}/confirm/`);
                setMessage({ type: 'success', text: response.data.message });
                await fetchOrderDetails(); // Refresh order data
            } catch (err) {
                console.error('Error confirming order:', err);
                setMessage({ 
                    type: 'error', 
                    text: err.response?.data?.error || 'Failed to confirm order' 
                });
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this order? This will restore items to inventory if the order was confirmed.')) {
            setActionLoading(true);
            setMessage(null);
            try {
                const response = await axios.post(`http://localhost:8000/api/orders/${orderId}/cancel/`);
                setMessage({ type: 'success', text: response.data.message });
                await fetchOrderDetails(); // Refresh order data
            } catch (err) {
                console.error('Error cancelling order:', err);
                setMessage({ 
                    type: 'error', 
                    text: err.response?.data?.error || 'Failed to cancel order' 
                });
            } finally {
                setActionLoading(false);
            }
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: { backgroundColor: '#fff3cd', color: '#856404', padding: '5px 15px', borderRadius: '15px', fontWeight: 'bold' },
            confirmed: { backgroundColor: '#d4edda', color: '#155724', padding: '5px 15px', borderRadius: '15px', fontWeight: 'bold' },
            cancelled: { backgroundColor: '#f8d7da', color: '#721c24', padding: '5px 15px', borderRadius: '15px', fontWeight: 'bold' }
        };
        return styles[status] || {};
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading order details...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: '#c62828' }}>{error}</div>;
    }

    if (!order) {
        return <div style={{ padding: '20px' }}>No order selected</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '900px' }}>
            <h2>Order Details</h2>

            {message && (
                <div style={{
                    padding: '10px',
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828',
                    marginBottom: '15px',
                    borderRadius: '4px'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                        <strong>Order Number:</strong>
                        <div style={{ fontSize: '18px', marginTop: '5px' }}>{order.order_number}</div>
                    </div>
                    <div>
                        <strong>Status:</strong>
                        <div style={{ marginTop: '5px' }}>
                            <span style={getStatusStyle(order.status)}>
                                {order.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div>
                        <strong>Total Amount:</strong>
                        <div style={{ fontSize: '18px', marginTop: '5px', color: '#4CAF50', fontWeight: 'bold' }}>
                            ${parseFloat(order.total_amount).toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <strong>Created:</strong>
                        <div style={{ marginTop: '5px' }}>
                            {new Date(order.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <h3>Order Items</h3>
            {order.items && order.items.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#e0e0e0' }}>
                            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Product</th>
                            <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>Quantity</th>
                            <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>Unit Price</th>
                            <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item) => (
                            <tr key={item.id}>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.product_name}</td>
                                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity}</td>
                                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>
                                    ${parseFloat(item.unit_price).toFixed(2)}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                    ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No items in this order</p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                    onClick={handleConfirm}
                    disabled={actionLoading || order.status === 'confirmed' || order.status === 'cancelled'}
                    style={{
                        padding: '12px 30px',
                        backgroundColor: (actionLoading || order.status === 'confirmed' || order.status === 'cancelled') ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (actionLoading || order.status === 'confirmed' || order.status === 'cancelled') ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    {actionLoading ? 'Processing...' : 'Confirm Order'}
                </button>

                <button
                    onClick={handleCancel}
                    disabled={actionLoading || order.status === 'cancelled'}
                    style={{
                        padding: '12px 30px',
                        backgroundColor: (actionLoading || order.status === 'cancelled') ? '#ccc' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (actionLoading || order.status === 'cancelled') ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    {actionLoading ? 'Processing...' : 'Cancel Order'}
                </button>
            </div>
        </div>
    );
};

export default OrderDetails;

