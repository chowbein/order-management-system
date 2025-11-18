import React, { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import ProductManagement from './ProductManagement';
import OrderList from './OrderList';
import ActivityLog from './ActivityLog';

/**
 * Main App Component
 * 
 * Single-page application structure with:
 * - Sidebar navigation
 * - Tab-based content switching
 * - Four main sections: Dashboard, Products, Orders, Activity Log
 * 
 * Navigation handled client-side (no routing library needed for this scope)
 */
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');  // Default view

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductManagement />;
      case 'orderList':
        return <OrderList />;
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
