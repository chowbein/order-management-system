import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'addition', 'deduction'

    useEffect(() => {
        fetchInventoryLogs();
    }, []);

    const fetchInventoryLogs = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:8000/api/inventory-logs/');
            setLogs(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching inventory logs:', err);
            setError('Failed to load inventory logs. Please make sure the Django server is running.');
        } finally {
            setLoading(false);
        }
    };

    const getChangeTypeStyle = (changeType) => {
        return changeType === 'addition' 
            ? { color: '#4CAF50', fontWeight: 'bold' }
            : { color: '#f44336', fontWeight: 'bold' };
    };

    const getChangeTypeIcon = (changeType) => {
        return changeType === 'addition' ? '↑' : '↓';
    };

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.change_type === filter;
    });

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading activity log...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: '#c62828' }}>{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px' }}>
            <h2>Inventory Activity Log</h2>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold' }}>Filter by type:</label>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                    <option value="all">All Changes</option>
                    <option value="addition">Additions Only</option>
                    <option value="deduction">Deductions Only</option>
                </select>
                <button
                    onClick={fetchInventoryLogs}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                    }}
                >
                    Refresh
                </button>
            </div>

            {filteredLogs.length === 0 ? (
                <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
                    No inventory changes found.
                </div>
            ) : (
                <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#e0e0e0' }}>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date & Time</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Product</th>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Quantity</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log, index) => (
                                <tr 
                                    key={log.id}
                                    style={{ 
                                        backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                                        borderBottom: '1px solid #e0e0e0'
                                    }}
                                >
                                    <td style={{ padding: '12px' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>
                                        {log.product_name}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={getChangeTypeStyle(log.change_type)}>
                                            {getChangeTypeIcon(log.change_type)} {log.change_type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ 
                                        padding: '12px', 
                                        textAlign: 'right',
                                        ...getChangeTypeStyle(log.change_type)
                                    }}>
                                        {log.change_type === 'addition' ? '+' : ''}{log.quantity_change}
                                    </td>
                                    <td style={{ padding: '12px', color: '#666' }}>
                                        {log.reason || 'No reason provided'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <strong>Total Logs:</strong> {filteredLogs.length}
                {filter !== 'all' && <span style={{ marginLeft: '10px', color: '#666' }}>({logs.length} total)</span>}
            </div>
        </div>
    );
};

export default ActivityLog;

