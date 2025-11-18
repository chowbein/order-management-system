# Order Management System

A full-stack order management application built with Django REST Framework and React. This project demonstrates a complete order processing system with inventory management, automated stock tracking, and comprehensive activity logging.

**👉 For detailed setup and usage instructions, see [setup-instructions.md](setup-instructions.md)**

---

## Features

### Core Functionality
- 📊 **Dashboard** - Real-time statistics for total orders, revenue, and low stock alerts
- 📦 **Product Management** - Full CRUD operations with automatic inventory logging
- 🛒 **Order Creation** - Multi-item orders with real-time stock validation
- ✅ **Order Management** - Confirm orders (with atomic stock deduction) and perform full or partial cancellations
- 📝 **Activity Log** - Unified timeline combining inventory changes and order activities

### Key Highlights
- ⚡ **Transaction Safety** - Database-level locking prevents race conditions and overselling
- 🔄 **Automatic Inventory Management** - Stock automatically deducted on order confirmation and restored on cancellation
- 🧪 **Handling of Edge Cases** - Negative inventory considered and app will block orders being confirmed if pending products and its quantities are greater than available stock

---

## Tech Stack

### Backend
- **Django 5.2.8** - Web framework
- **Django REST Framework 3.16.1** - RESTful API
- **SQLite** - Database (development)
- **django-cors-headers 4.9.0** - CORS handling

### Frontend
- **React 18** - UI framework
- **Axios** - HTTP client
- **CSS3** - Styling 

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+ and npm
- Git

### Installation & Running

```bash
# Clone the repository
git clone <repository-url>
cd order-management-system

# Option 1: One-command start (macOS)
./start-all.sh

# Option 2: Manual start (all platforms)
# Terminal 1 - Backend
./start-backend.sh

# Terminal 2 - Frontend
./start-frontend.sh
```

**Access the application:**
- http://localhost:3000

📖 **For detailed setup instructions, troubleshooting, and testing guides, see [setup-instructions.md](setup-instructions.md)**

---

## Project Structure

```
order-management-system/
├── README.md                    # This file
├── setup-instructions.md        # Detailed setup guide
├── start-all.sh                 # Convenience script (macOS)
├── start-backend.sh             # Backend startup script
├── start-frontend.sh            # Frontend startup script
├── backend/
│   ├── api/                     # Django app
│   │   ├── models.py            # Database models
│   │   ├── views.py             # API endpoints
│   │   ├── serializers.py       # DRF serializers
│   │   ├── test_models.py       # Model tests
│   │   ├── test_views.py        # API tests
│   │   └── test_edge_cases.py   # Edge case & concurrency tests
│   ├── config/                  # Django settings
│   ├── manage.py                # Django management
│   ├── requirements.txt         # Python dependencies
│   └── db.sqlite3              # SQLite database (auto-generated)
└── frontend/
    ├── src/
    │   ├── App.js               # Main app component
    │   ├── Dashboard.js         # Dashboard view
    │   ├── ProductManagement.js # Product CRUD
    │   ├── OrderForm.js         # Order creation
    │   ├── OrderList.js         # Order management
    │   ├── ActivityLog.js       # Activity timeline
    │   └── apiConfig.js         # API configuration
    ├── package.json             # Node dependencies
    └── public/                  # Static assets
```

---

## Database Schema

The system uses the following database structure:

### Products
- `id`, `name`, `description`, `price`, `stock_quantity`, `created_at`
- **Constraint**: `stock_quantity` cannot be negative (DB-level check)

### Orders
- `id`, `order_number` (unique), `status`, `total_amount`, `created_at`
- **Status choices**: `pending`, `confirmed`, `cancelled`

### Order_Items
- `id`, `order_id` (FK), `product_id` (FK), `quantity`, `unit_price`
- **Cascade delete**: When order is deleted, items are deleted

### Inventory_Logs
- `id`, `product_id` (FK), `change_type`, `quantity_change`, `reason`, `created_at`
- **Change types**: `addition`, `deduction`

### Order_Activities
- `id`, `order_id` (FK), `activity_type`, `description`, `timestamp`
- **Tracks**: Order creation, confirmation, cancellation, item modifications

## API Endpoints

### Products
- `GET /api/products/` - List all products
- `POST /api/products/` - Create product
- `GET /api/products/{id}/` - Get product details
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product

### Orders
- `GET /api/orders/` - List all orders
- `POST /api/orders/` - Create order
- `GET /api/orders/{id}/` - Get order details
- `POST /api/orders/{id}/confirm/` - Confirm order (deducts stock)
- `POST /api/orders/{id}/cancel/` - Cancel order (restores stock if confirmed)
- `POST /api/orders/{id}/update-item/` - Update/remove order item (confirmed orders only)

### Dashboard & Logs
- `GET /api/dashboard/` - Get statistics (total orders, revenue, low stock)
- `GET /api/activity-log/` - Get unified activity timeline
- `GET /api/inventory-logs/` - Get inventory change logs
- `GET /api/order-items/` - Get all order items

---

## Key Technical Decisions


---

## Challenges Faced & Solutions

