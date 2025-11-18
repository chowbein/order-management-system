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
- 🧪 **Handling of Edge Cases** - Negative inventory prevented and app will block orders being confirmed if pending products and its quantities are greater than available stock. The same is true if an order is being created that asks for more stocks of an item than what's available.
- 🛑 **Invalid Inputs/Error Handling** - Clear messages to the user for invalid amounts entered when creating products or orders. Similarly, lack of inventory messages are displayed and prevents any changes if the user confirms or creates an order exceeding the stock that's available.

---

## Screenshots

### Dashboard
Real-time statistics and low stock alerts:

![Dashboard](screenshots/dashboard.png)

### Product Management
Full CRUD operations with inventory tracking:

![Product Management](screenshots/products.png)

### Order Management
Create and manage orders with stock validation:

![Order Details](screenshots/orders.png)

### Activity Log
Unified timeline of all system activities:

![Activity Log](screenshots/activity-log.png)

---

## Tech Stack

This project uses a classic and robust combination for full-stack web applications. Django and Django REST Framework provide a powerful and secure backend, ideal for rapid development of the RESTful API needed for order and inventory management. React is used for the frontend to create a dynamic and responsive user interface, allowing for a seamless user experience especially considering all the live updates expected from the logs, orders, and products (with its stocks). SQLite is used as a simple and file-based database, ideal for development and demonstration purposes.

### Backend
- **Django 5.2.8** - Web framework
- **Django REST Framework 3.16.1** - RESTful API
- **SQLite** - Database (development)
- **django-cors-headers 4.9.0** - CORS handling

### Frontend
- **React 19.2.0** - UI framework
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


---

## Challenges Faced & Solutions

This entire project took ~9 hours to build and just like the first, one of the biggest challenges faced was the time constraint especially this time where the requirements were much stricter in contrast to the first where I was being allowed the freedom to creatively develop the app in my own way. It was because of this that I had to carefully manage my time to ensure that each feature (Inventory, Orders, and Logs) were properly set up especially considering that these three all interact with each other. The approach I used to address this was to prioritize setting up the foundations of the app first ensuring the backend logic and data structure are solid before building the user interface. This component-based approach allowed me to build and test each piece independently before integrating them, which was crucial given the time constraints. The modularized code structure also proved invaluable for debugging—when issues arose, I could quickly isolate which component or API endpoint was causing the problem, making fixes significantly faster and saving considerable time. It is only after this that I tried to refine and fix the small bugs and implement the styling (CSS) which I thought could be done simultaneously with each other. 

Other than this, another key challenge I faced was understanding how the edge cases worked and making sure (through testing) the common ones are handled properly. One example of this was when I discovered that adding or editing a product from the inventory didn't reflect on the activity logs as the initial code set up only considered changes in the orders (whether it was confirmed or cancelled). Another was when I tried to test this fix only to discover that deleting a product also deleted all its logs. These cases during testing are always concerning as it makes you think twice about other user flows or interactions that you didn't consider could break the logic of the app. The key to adressing this was to understand the perspective of the user. Even if I had more time, it wouldn't be practical to go through every possible use case a product could have. Because of this, you need to only consider what the user is likely to do with your product and understand what scenarios they could be facing when using it. This was key for me as thinking about it as a user-first product it made it clear what edge cases to prioritize and work on.

