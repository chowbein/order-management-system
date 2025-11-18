import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import './OrderList.css';
import Modal from './Modal';
import OrderForm from './OrderForm';

/**
 * OrderList Component
 * 
 * Complex order management interface with:
 * - View all orders (pending, confirmed, cancelled)
 * - Confirm orders (deducts inventory)
 * - Cancel entire orders (restores inventory if confirmed)
 * - Partial cancellation (remove individual items from confirmed orders)
 * - Update item quantities (increase/decrease)
 * 
 * Key Business Logic:
 * - Pending orders can be confirmed
 * - Confirmed orders can be cancelled (stock restored) or partially modified
 * - Cancelled orders cannot be changed
 * - Stock validation happens on backend
 * 
 * API Integration:
 * - GET /api/orders/ - Fetch all orders
 * - POST /api/orders/{id}/confirm/ - Confirm order
 * - POST /api/orders/{id}/cancel/ - Cancel order
 * - POST /api/orders/{id}/update-item/ - Modify order item quantity
 */
const OrderList = ({ selectedOrderId: initialSelectedId }) => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // Tracks item being edited
    const [isCreateOrderModalOpen, setCreateOrderModalOpen] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    // Auto-select order if navigated from Create Order page
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
    
    /**
     * Handle order confirmation or cancellation
     * 
     * Confirm: Changes status pending → confirmed, deducts inventory
     * Cancel: Changes status to cancelled, restores inventory (if was confirmed)
     * 
     * Backend validates:
     * - Order status (can't confirm already confirmed orders)
     * - Stock availability (can't confirm if insufficient stock)
     * - Uses @transaction.atomic for data integrity
     */
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
                
                // Refresh order list and update selected order with latest data
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

    /**
     * Partial Cancellation - Remove a single item from confirmed order
     * 
     * Use case: Customer changes their mind about one product after order confirmed
     * - Removes the item completely
     * - Restores stock for that item
     * - Recalculates order total
     * - Only works on confirmed orders (pending orders can be edited before confirmation)
     */
    const handleCancelItem = async (itemId) => {
        if (!selectedOrder) return;

        if (window.confirm('Are you sure you want to cancel this single item? Stock will be restored.')) {
            setActionLoading(true);
            setMessage(null);
            try {
                const response = await axios.post(`${API_BASE_URL}/api/orders/${selectedOrder.id}/update-item/`, {
                    order_item_id: itemId,
                    new_quantity: 0  // Setting to 0 removes the item
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

    const handleUpdateItem = async () => {
        if (!selectedOrder || !editingItem) return;
    
        setActionLoading(true);
        setMessage(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/orders/${selectedOrder.id}/update-item/`, {
                order_item_id: editingItem.id,
                new_quantity: editingItem.quantity
            });
            setMessage({ type: 'success', text: response.data.message });
            setEditingItem(null); // Exit edit mode
            await fetchOrders(); // This re-fetches the entire list
            // Find the updated order in the refreshed list to update the view
            const updatedOrderFromServer = response.data.order;
            const refreshedOrders = await axios.get(`${API_BASE_URL}/api/orders/`);
            const finalUpdatedOrder = refreshedOrders.data.find(o => o.id === updatedOrderFromServer.id);
            setSelectedOrder(finalUpdatedOrder || null);

        } catch (err) {
            console.error('Error updating item:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update item' });
        } finally {
            setActionLoading(false);
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

    const getStatusStyle = (status) => `ol-status-badge ${status}`;

    const handleOrderCreated = (newOrderId) => {
        setCreateOrderModalOpen(false);
        fetchOrders().then(() => {
            // After fetching, find and select the newly created order
            // This requires fetchOrders to resolve with the new list of orders or to update state correctly
            // A slight delay might be needed if state update isn't immediate
            setTimeout(() => {
                const newOrder = orders.find(o => o.id === newOrderId);
                if (newOrder) {
                    setSelectedOrder(newOrder);
                }
            }, 500); // 500ms delay to allow state to propagate, can be optimized
        });
    };

    return (
        <div className="order-list-container">
            {/* Order Details Panel */}
            <div className="ol-details-panel">
                {selectedOrder ? (
                    <>
                        {message && (
                            <div className={`ol-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}
                        <div className="ol-details-header">
                            <h2>Order Details</h2>
                            <span className={getStatusStyle(selectedOrder.status)}>{selectedOrder.status}</span>
                        </div>
                        
                        <div className="ol-details-summary">
                            <p><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                            <p><strong>Total Amount:</strong> ₱{parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                            <p><strong>Created At:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                        </div>

                        <h3>Order Items</h3>
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                            <table className="ol-details-items-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th className="center-align">Quantity</th>
                                        <th className="right-align">Unit Price</th>
                                        <th className="right-align">Subtotal</th>
                                        {selectedOrder.status === 'confirmed' && (
                                            <th className="center-align">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map(item => {
                                        const isEditing = editingItem?.id === item.id;
                                        return isEditing ? (
                                            <tr key={item.id}>
                                                <td>{item.product_name}</td>
                                                <td className="center-align">
                                                    <input
                                                        type="number"
                                                        value={editingItem.quantity}
                                                        onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) })}
                                                        className="ol-item-edit-input"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="right-align">₱{parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td className="right-align bold">
                                                    ₱{(parseFloat(item.unit_price) * editingItem.quantity).toFixed(2)}
                                                </td>
                                                <td className="center-align ol-item-edit-actions">
                                                    <button onClick={handleUpdateItem} disabled={actionLoading}>Save</button>
                                                    <button onClick={() => setEditingItem(null)}>Cancel</button>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={item.id}>
                                                <td>{item.product_name}</td>
                                                <td className="center-align">{item.quantity}</td>
                                                <td className="right-align">₱{parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td className="right-align bold">
                                                    ₱{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                                                </td>
                                                {selectedOrder.status === 'confirmed' && (
                                                    <td className="center-align">
                                                        <button 
                                                            onClick={() => setEditingItem({ id: item.id, quantity: item.quantity })}
                                                            className="ol-item-edit-btn"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p>No items in this order</p>
                        )}
                        
                        <div className="ol-details-actions">
                            <button
                                onClick={() => handleAction('cancel')}
                                disabled={actionLoading || selectedOrder.status === 'cancelled'}
                                className="ol-action-btn cancel"
                            >
                                Cancel Order
                            </button>
                            <button
                                onClick={() => handleAction('confirm')}
                                disabled={actionLoading || selectedOrder.status !== 'pending'}
                                className="ol-action-btn confirm"
                            >
                                Confirm Order
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="ol-details-placeholder">
                        <div className="icon">→</div>
                        <h3>Select an order to view details</h3>
                    </div>
                )}
            </div>

            {/* Order List and Search Panel */}
            <div className="ol-list-panel">
                <div className="ol-list-header">
                    <h4>All Orders</h4>
                    <button className="ol-create-btn" onClick={() => setCreateOrderModalOpen(true)}>
                        + Create Order
                    </button>
                </div>
                <div className="ol-search-bar">
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="ol-list">
                    {loading && <p style={{ padding: '15px' }}>Loading orders...</p>}
                    {error && <p style={{ padding: '15px', color: 'red' }}>{error}</p>}
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`ol-list-item ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                        >
                            <div className="ol-list-item-info">
                                <div className="order-number">{order.order_number}</div>
                                <div className="order-date">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className={getStatusStyle(order.status)}>{order.status}</div>
                        </div>
                    ))}
                </div>
            </div>

            <Modal isOpen={isCreateOrderModalOpen} onClose={() => setCreateOrderModalOpen(false)}>
                <OrderForm onOrderCreated={handleOrderCreated} />
            </Modal>
        </div>
    );
};

export default OrderList;
