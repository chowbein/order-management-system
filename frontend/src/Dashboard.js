import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import './Dashboard.css';

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
        return <div className="loading-message">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Dashboard</h2>
                <button
                    onClick={fetchStatistics}
                    className="refresh-btn"
                >
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="stats-cards">
                {/* Total Orders Card */}
                <div className="stat-card">
                    <div className="stat-card-title">
                        Total Orders
                    </div>
                    <div className="stat-card-value total-orders">
                        {statistics?.total_orders || 0}
                    </div>
                    <div className="stat-card-subtitle">
                        All time orders
                    </div>
                </div>

                {/* Total Revenue Card */}
                <div className="stat-card">
                    <div className="stat-card-title">
                        Total Revenue
                    </div>
                    <div className="stat-card-value total-revenue">
                        ₱{(statistics?.total_revenue || 0).toFixed(2)}
                    </div>
                    <div className="stat-card-subtitle">
                        From confirmed orders
                    </div>
                </div>

                {/* Low Stock Alert Card */}
                <div className="stat-card">
                    <div className="stat-card-title">
                        Low Stock Alert
                    </div>
                    <div className="stat-card-value low-stock-alert">
                        {statistics?.low_stock_products?.length || 0}
                    </div>
                    <div className="stat-card-subtitle">
                        Products below 10 units
                    </div>
                </div>
            </div>

            {/* Low Stock Products Table */}
            <div className="low-stock-table-container">
                <h3>Low Stock Products</h3>
                {statistics?.low_stock_products && statistics.low_stock_products.length > 0 ? (
                    <table className="low-stock-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Current Stock</th>
                                <th>Price</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statistics.low_stock_products.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        {product.name}
                                    </td>
                                    <td className={`stock-quantity ${product.stock_quantity === 0 ? 'out-of-stock' : 'low-stock'}`}>
                                        {product.stock_quantity}
                                    </td>
                                    <td>
                                        ₱{parseFloat(product.price).toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${product.stock_quantity === 0 ? 'out-of-stock' : 'low-stock'}`}>
                                            {product.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="well-stocked-message">
                        <div className="icon">✓</div>
                        <div className="title">All products are well stocked!</div>
                        <div className="subtitle">No products below 10 units</div>
                    </div>
                )}
            </div>

            {/* Last Updated */}
            <div className="last-updated">
                Last updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default Dashboard;

