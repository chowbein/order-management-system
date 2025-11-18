import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import './ActivityLog.css';

/**
 * ActivityLog Component
 * 
 * Displays unified timeline of all system activities:
 * - Order events (created, confirmed, cancelled)
 * - Inventory changes (stock additions/deductions)
 * 
 * Features:
 * - Chronological sorting (newest first)
 * - Filter by type (all, orders, inventory)
 * - Color-coded changes (green for additions, red for deductions)
 * - Complete audit trail for compliance
 * 
 * API Integration:
 * - GET /api/activity-log/ - Fetches unified log from backend
 */
const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // Filter: 'all', 'order', 'inventory'

    useEffect(() => {
        fetchActivityLogs();
    }, []);

    const fetchActivityLogs = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/activity-log/`);
            setLogs(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching activity logs:', err);
            setError('Failed to load activity logs.');
        } finally {
            setLoading(false);
        }
    };

    // Client-side filtering for better UX (instant response)
    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.log_type === filter;
    });

    // Render different log types with appropriate formatting
    const renderLog = (log) => {
        // Inventory logs: show product name, change type, quantity
        if (log.log_type === 'inventory') {
            const { product_name, change_type, quantity_change, reason } = log.details;
            const isAddition = change_type === 'addition';
            return (
                <>
                    <td><strong>{product_name}</strong></td>
                    <td>
                        <span className={`al-log-activity ${isAddition ? 'inventory-add' : 'inventory-deduct'}`}>
                            {isAddition ? 'Stock Added' : 'Stock Deducted'}
                        </span>
                    </td>
                    <td>{reason}</td>
                    <td className={`al-log-change ${isAddition ? 'addition' : 'deduction'}`}>
                        {isAddition ? '+' : ''}{quantity_change}
                    </td>
                </>
            );
        }

        // Order logs: show order number, activity type, description
        if (log.log_type === 'order') {
            const { order_number, activity_type, description } = log.details;
            return (
                <>
                    <td><strong>{order_number}</strong></td>
                    <td>
                        <span className="al-log-activity order">
                            {activity_type}
                        </span>
                    </td>
                    <td colSpan="2">{description}</td>
                </>
            );
        }
        return <td colSpan="4">Unknown log type</td>;
    };

    if (loading) return <div className="loading-message">Loading activity log...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="activity-log-container">
            <div className="al-header">
                <h2>Unified Activity Log</h2>
                <div className="al-controls">
                    <select onChange={(e) => setFilter(e.target.value)} value={filter}>
                        <option value="all">All Activities</option>
                        <option value="order">Order Activities</option>
                        <option value="inventory">Inventory Changes</option>
                    </select>
                    <button onClick={fetchActivityLogs}>Refresh</button>
                </div>
            </div>
            
            {filteredLogs.length === 0 ? (
                <p className="no-activity-message">No activity found.</p>
            ) : (
                <table className="al-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Entity</th>
                            <th>Activity</th>
                            <th>Description / Reason</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id}>
                                <td className="al-timestamp">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                {renderLog(log)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ActivityLog;

