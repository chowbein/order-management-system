import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'order', 'inventory'

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

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.log_type === filter;
    });

    const renderLog = (log) => {
        if (log.log_type === 'inventory') {
            const { product_name, change_type, quantity_change, reason } = log.details;
            const isAddition = change_type === 'addition';
            return (
                <>
                    <td><strong>{product_name}</strong></td>
                    <td>
                        <span style={{ color: isAddition ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>
                            {isAddition ? 'Stock Added' : 'Stock Deducted'}
                        </span>
                    </td>
                    <td>{reason}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: isAddition ? '#4CAF50' : '#f44336' }}>
                        {isAddition ? '+' : ''}{quantity_change}
                    </td>
                </>
            );
        }

        if (log.log_type === 'order') {
            const { order_number, activity_type, description } = log.details;
            return (
                <>
                    <td><strong>{order_number}</strong></td>
                    <td>
                        <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
                            {activity_type}
                        </span>
                    </td>
                    <td colSpan="2">{description}</td>
                </>
            );
        }
        return <td colSpan="4">Unknown log type</td>;
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading activity log...</div>;
    if (error) return <div style={{ padding: '20px', color: '#c62828' }}>{error}</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px' }}>
            <h2>Unified Activity Log</h2>
            {/* Filter and Refresh buttons */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <select onChange={(e) => setFilter(e.target.value)} value={filter} style={{ padding: '8px' }}>
                    <option value="all">All Activities</option>
                    <option value="order">Order Activities</option>
                    <option value="inventory">Inventory Changes</option>
                </select>
                <button onClick={fetchActivityLogs} style={{ padding: '8px 16px' }}>Refresh</button>
            </div>
            
            {filteredLogs.length === 0 ? (
                <p>No activity found.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#e0e0e0' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Timestamp</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Entity</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Activity</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Description / Reason</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', color: '#666' }}>
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

