# Order Management System

A full-stack order management application built with Django REST Framework and React.

## Features

- 📊 **Dashboard** - View total orders, revenue, and low stock alerts
- 📦 **Product Management** - Add, edit, delete products with inventory tracking
- 🛒 **Order Creation** - Create orders with multiple items
- ✅ **Order Management** - Confirm and cancel orders with automatic inventory updates
- 📝 **Activity Log** - Track all inventory changes

## Quick Start

### Prerequisites

- Python 3.11+ installed
- Node.js and npm installed
- Terminal/Command Line access

### Running the Application

**1. Start the Backend (Django API):**
```bash
./start-backend.sh
```

**2. Start the Frontend (React App):**

Open a new terminal window and run:
```bash
./start-frontend.sh
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

### Stopping the Servers

Press `Ctrl+C` in each terminal window to stop the servers.

## Project Structure

```
order-management-system/
├── backend/                # Django REST API
│   ├── api/               # Main API app
│   │   ├── models.py      # Database models
│   │   ├── views.py       # API views
│   │   ├── serializers.py # DRF serializers
│   │   └── migrations/    # Database migrations
│   ├── config/            # Django settings
│   ├── venv/              # Python virtual environment
│   ├── db.sqlite3         # SQLite database
│   └── requirements.txt   # Python dependencies
├── frontend/              # React application
│   ├── src/
│   │   ├── Dashboard.js           # Dashboard component
│   │   ├── ProductManagement.js   # Product CRUD
│   │   ├── OrderForm.js           # Create orders
│   │   ├── OrderDetails.js        # View/manage orders
│   │   └── ActivityLog.js         # Inventory logs
│   └── package.json       # Node dependencies
├── start-backend.sh       # Backend startup script
└── start-frontend.sh      # Frontend startup script
```

## API Endpoints

### Products
- `GET /api/products/` - List all products
- `POST /api/products/` - Create product
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product

### Orders
- `GET /api/orders/` - List all orders
- `POST /api/orders/` - Create order
- `POST /api/orders/{id}/confirm/` - Confirm order (deduct inventory)
- `POST /api/orders/{id}/cancel/` - Cancel order (restore inventory)

### Other Endpoints
- `GET /api/dashboard/` - Dashboard statistics
- `GET /api/inventory-logs/` - Inventory change history
- `GET /api/order-items/` - Order items

## Database

The project uses SQLite for development. The database file is located at:
```
backend/db.sqlite3
```

You can connect to it using TablePlus or any SQLite browser.

## Tech Stack

### Backend
- Django 5.2.8
- Django REST Framework 3.16.1
- SQLite
- django-cors-headers

### Frontend
- React 18
- Axios
- Modern CSS (inline styles)

## Development

### Backend Development
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm start
```

### Database Migrations
```bash
cd backend
source venv/bin/activate
python manage.py makemigrations
python manage.py migrate
```

### Create Admin User
```bash
cd backend
source venv/bin/activate
python manage.py createsuperuser
```

Then visit http://localhost:8000/admin

## Troubleshooting

### Port Already in Use
If port 8000 or 3000 is already in use:

**Backend:**
```bash
python manage.py runserver 8001
```

**Frontend:**
```bash
PORT=3001 npm start
```

### CORS Errors
CORS is already configured. If you still see errors, make sure:
- Django server is running
- `corsheaders` is installed
- Settings are correct

### Module Not Found
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## License

This project is for educational purposes.

