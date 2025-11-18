import React, { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import ProductManagement from './ProductManagement';
import OrderForm from './OrderForm';
import OrderList from './OrderList';
import ActivityLog from './ActivityLog';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleOrderCreated = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveTab('orderList');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductManagement />;
      case 'createOrder':
        return <OrderForm onOrderCreated={handleOrderCreated} />;
      case 'orderList':
        return <OrderList selectedOrderId={selectedOrderId} />;
      case 'activityLog':
        return <ActivityLog />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>OMS</h2>
        </div>
        <ul className="sidebar-menu">
          <li
            className={`sidebar-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </li>
          <li
            className={`sidebar-menu-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </li>
          <li
            className={`sidebar-menu-item ${activeTab === 'createOrder' ? 'active' : ''}`}
            onClick={() => setActiveTab('createOrder')}
          >
            Create Order
          </li>
          <li
            className={`sidebar-menu-item ${activeTab === 'orderList' ? 'active' : ''}`}
            onClick={() => setActiveTab('orderList')}
          >
            Orders
          </li>
          <li
            className={`sidebar-menu-item ${activeTab === 'activityLog' ? 'active' : ''}`}
            onClick={() => setActiveTab('activityLog')}
          >
            Activity Log
          </li>
        </ul>
      </div>
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
