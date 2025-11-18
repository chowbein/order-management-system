import React, { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import ProductManagement from './ProductManagement';
import OrderForm from './OrderForm';
import OrderDetails from './OrderDetails';
import ActivityLog from './ActivityLog';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleOrderCreated = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveTab('orderDetails');
  };

  const tabStyle = (tabName) => ({
    padding: '12px 24px',
    backgroundColor: activeTab === tabName ? '#2196F3' : '#e0e0e0',
    color: activeTab === tabName ? 'white' : '#333',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: activeTab === tabName ? 'bold' : 'normal',
    transition: 'all 0.3s'
  });

  return (
    <div className="App">
      <div style={{ backgroundColor: '#1976D2', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>Order Management System</h1>
      </div>
      
      <div style={{ display: 'flex', borderBottom: '2px solid #2196F3' }}>
        <button onClick={() => setActiveTab('dashboard')} style={tabStyle('dashboard')}>
          Dashboard
        </button>
        <button onClick={() => setActiveTab('products')} style={tabStyle('products')}>
          Products
        </button>
        <button onClick={() => setActiveTab('createOrder')} style={tabStyle('createOrder')}>
          Create Order
        </button>
        <button onClick={() => setActiveTab('orderDetails')} style={tabStyle('orderDetails')}>
          Order Details
        </button>
        <button onClick={() => setActiveTab('activityLog')} style={tabStyle('activityLog')}>
          Activity Log
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'createOrder' && <OrderForm onOrderCreated={handleOrderCreated} />}
        {activeTab === 'orderDetails' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Enter Order ID:</label>
              <input
                type="number"
                value={selectedOrderId || ''}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                placeholder="e.g., 1"
                style={{ padding: '8px', fontSize: '14px', width: '150px' }}
              />
            </div>
            {selectedOrderId ? (
              <OrderDetails orderId={selectedOrderId} />
            ) : (
              <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                Please enter an order ID to view details
              </div>
            )}
          </div>
        )}
        {activeTab === 'activityLog' && <ActivityLog />}
      </div>
    </div>
  );
}

export default App;
