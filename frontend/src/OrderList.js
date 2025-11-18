import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const OrderList = ({ selectedOrderId: initialSelectedId }) => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (initialSelectedId && orders.length > 0) {
            const orderToSelect = orders.find(o => o.id === initialSelectedId);
            setSelectedOrder(orderToSelect || null);
        }
    }, [initialSelectedId, orders]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/orders/`);
            // Sort orders by most recent first
            const sortedOrders = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setOrders(sortedOrders);
            setError(null);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };
    
    const handleAction = async (actionType) => {
        if (!selectedOrder) return;

        const confirmMessage = actionType === 'confirm'
            ? 'Are you sure you want to confirm this order? This will deduct items from inventory.'
            : 'Are you sure you want to cancel this order? This may restore items to inventory.';

        if (window.confirm(confirmMessage)) {
            setActionLoading(true);
            setMessage(null);
            try {
                const response = await axios.post(`${API_BASE_URL}/api/orders/${selectedOrder.id}/${actionType}/`);
                setMessage({ type: 'success', text: response.data.message });
                // Refresh the list and the selected order details
                await fetchOrders();
                const updatedOrder = response.data.order;
                setSelectedOrder(updatedOrder);
            } catch (err) {
                console.error(`Error ${actionType}ing order:`, err);
                setMessage({ type: 'error', text: err.response?.data?.error || `Failed to ${actionType} order` });
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleCancelItem = async (itemId) => {
        if (!selectedOrder) return;

        if (window.confirm('Are you sure you want to cancel this single item? Stock will be restored.')) {
            setActionLoading(true);
            setMessage(null);
            try {
                const response = await axios.post(`${API_BASE_URL}/api/orders/${selectedOrder.id}/cancel-item/`, {
                    order_item_id: itemId
                });
                setMessage({ type: 'success', text: response.data.message });
                // Refresh data
                await fetchOrders();
                const updatedOrder = response.data.order;
                setSelectedOrder(updatedOrder);
            } catch (err) {
                console.error('Error cancelling item:', err);
                setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to cancel item' });
            } finally {
                setActionLoading(false);
            }
        }
    };

    const filteredOrders = orders.filter(order => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
            order.order_number.toLowerCase().includes(searchTermLower) ||
            order.status.toLowerCase().includes(searchTermLower) ||
            order.total_amount.toString().includes(searchTermLower)
        );
    });

    const getStatusStyle = (status) => {
        const styles = {
            pending: { backgroundColor: '#fff3cd', color: '#856404' },
            confirmed: { backgroundColor: '#d4edda', color: '#155724' },
            cancelled: { backgroundColor: '#f8d7da', color: '#721c24' }
        };
        return { 
            ...styles[status], 
            padding: '4px 12px', 
            borderRadius: '12px', 
            fontWeight: 'bold',
            fontSize: '12px',
            textTransform: 'uppercase'
        };
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', height: 'calc(100vh - 150px)' }}>
            {/* Order List and Search Panel */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading && <p style={{ padding: '15px' }}>Loading orders...</p>}
                    {error && <p style={{ padding: '15px', color: 'red' }}>{error}</p>}
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            style={{
                                padding: '15px',
                                borderBottom: '1px solid #eee',
                                cursor: 'pointer',
                                backgroundColor: selectedOrder?.id === order.id ? '#e3f2fd' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{order.order_number}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {new Date(order.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={getStatusStyle(order.status)}>{order.status}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Details Panel */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflowY: 'auto', padding: '20px' }}>
                {selectedOrder ? (
                    <>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Order Details</h2>
                            <span style={getStatusStyle(selectedOrder.status)}>{selectedOrder.status}</span>
                        </div>
                        
                        <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                            <p><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                            <p><strong>Total Amount:</strong> ${parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                            <p><strong>Created At:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                        </div>

                        <h3>Order Items</h3>
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#e0e0e0' }}>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Quantity</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Subtotal</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((item) => (
                                        <tr key={item.id}>
                                            <td style={{ padding: '12px' }}>{item.product_name}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>${parseFloat(item.unit_price).toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                                                ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                {selectedOrder.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => handleCancelItem(item.id)}
                                                        disabled={actionLoading}
                                                        style={{
                                                            padding: '4px 10px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#ff9800',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancel Item
                                                    </button>
                                                )}
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
                                onClick={() => handleAction('confirm')}
                                disabled={actionLoading || selectedOrder.status !== 'pending'}
                                style={{ padding: '12px 30px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: actionLoading || selectedOrder.status !== 'pending' ? 0.5 : 1 }}
                            >
                                Confirm Order
                            </button>
                            <button
                                onClick={() => handleAction('cancel')}
                                disabled={actionLoading || selectedOrder.status === 'cancelled'}
                                style={{ padding: '12px 30px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: actionLoading || selectedOrder.status === 'cancelled' ? 0.5 : 1 }}
                            >
                                Cancel Order
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>←</div>
                        <h3 style={{ margin: 0 }}>Select an order to view details</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderList;
