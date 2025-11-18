import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const Dashboard = () => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStatistics();
        // Refresh statistics every 30 seconds
        const interval = setInterval(fetchStatistics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatistics = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/dashboard/`);
            setStatistics(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching dashboard statistics:', err);
            setError('Failed to load dashboard data. Please make sure the Django server is running.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading dashboard...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: '#c62828' }}>{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>Dashboard</h2>
                <button
                    onClick={fetchStatistics}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {/* Total Orders Card */}
                <div style={{
                    backgroundColor: '#fff',
                    padding: '25px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0'
                }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '500' }}>
                        Total Orders
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2196F3' }}>
                        {statistics?.total_orders || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                        All time orders
                    </div>
                </div>

                {/* Total Revenue Card */}
                <div style={{
                    backgroundColor: '#fff',
                    padding: '25px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0'
                }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '500' }}>
                        Total Revenue
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4CAF50' }}>
                        ${(statistics?.total_revenue || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                        From confirmed orders
                    </div>
                </div>

                {/* Low Stock Alert Card */}
                <div style={{
                    backgroundColor: '#fff',
                    padding: '25px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0'
                }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '500' }}>
                        Low Stock Alert
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f44336' }}>
                        {statistics?.low_stock_products?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                        Products below 10 units
                    </div>
                </div>
            </div>

            {/* Low Stock Products Table */}
            <div style={{ marginTop: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>Low Stock Products</h3>
                {statistics?.low_stock_products && statistics.low_stock_products.length > 0 ? (
                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f44336', color: 'white' }}>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Product Name</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Current Stock</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Price</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statistics.low_stock_products.map((product, index) => (
                                    <tr 
                                        key={product.id}
                                        style={{ 
                                            backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                                            borderBottom: '1px solid #e0e0e0'
                                        }}
                                    >
                                        <td style={{ padding: '15px', fontWeight: '500' }}>
                                            {product.name}
                                        </td>
                                        <td style={{ 
                                            padding: '15px', 
                                            textAlign: 'center',
                                            color: product.stock_quantity === 0 ? '#f44336' : '#ff9800',
                                            fontWeight: 'bold',
                                            fontSize: '18px'
                                        }}>
                                            {product.stock_quantity}
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'right' }}>
                                            ${parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '5px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: product.stock_quantity === 0 ? '#ffebee' : '#fff3e0',
                                                color: product.stock_quantity === 0 ? '#c62828' : '#e65100'
                                            }}>
                                                {product.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ 
                        padding: '30px', 
                        backgroundColor: '#e8f5e9', 
                        borderRadius: '8px', 
                        textAlign: 'center',
                        color: '#2e7d32'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>✓</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>All products are well stocked!</div>
                        <div style={{ fontSize: '14px', marginTop: '5px' }}>No products below 10 units</div>
                    </div>
                )}
            </div>

            {/* Last Updated */}
            <div style={{ 
                marginTop: '20px', 
                textAlign: 'right', 
                color: '#999', 
                fontSize: '12px' 
            }}>
                Last updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default Dashboard;

