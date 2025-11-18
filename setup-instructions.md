# Setup Instructions for Order Management System

This guide provides all the necessary steps to set up, run, and test the application locally.

## Prerequisites

- **Python 3.11+** installed
- **Node.js and npm** installed
- A terminal or command line application

## 1. Initial Setup

Clone the repository and navigate into the project directory.

## 2. Running the Application

For convenience, you can use startup scripts to run the application.

### Option A: Automatic Start (macOS Only)

This will open two new terminal windows for the backend and frontend automatically.

```bash
./start-all.sh
```
*Note: You may be prompted to grant permissions for Cursor/your terminal to control the "Terminal" app. This is safe to allow.*

### Option B: Manual Start (All Platforms)

Open **two separate terminals**.

**In Terminal 1 (Backend):**
```bash
./start-backend.sh
```

**In Terminal 2 (Frontend):**
```bash
./start-frontend.sh
```

Once running, the application will be available at:
- **Frontend UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`

### What the Scripts Do

- `start-backend.sh`: Activates the Python virtual environment, applies any pending database migrations, and starts the Django server.
- `start-frontend.sh`: Installs Node.js dependencies (if missing) and starts the React development server.

## 3. How to Test the Features (Sample Data Guide)

The best way to create sample data is to use the application's UI.

### Step 1: Create Products

1.  Navigate to the **Products** tab.
2.  Click the **+ Add New Product** button.
3.  Create 3-4 sample products. Use the following as a guide:

| Name | Description | Price | Stock Quantity |
| :--- | :--- | :--- | :--- |
| Gaming Mouse | A high-precision gaming mouse. | 75.50 | 50 |
| Mechanical Keyboard | Clicky and responsive keyboard. | 120.00 | 25 |
| 4K Monitor | 27-inch ultra-high-definition monitor. | 350.00 | 8 |
| USB-C Hub | 7-in-1 USB-C adapter. | 45.99 | 100 |

### Step 2: Create an Order

1.  Navigate to the **Create Order** tab.
2.  Enter a unique **Order Number**, for example, `ORDER-001`.
3.  Click **+ Add Item** and add a few of the products you just created.
4.  Adjust the quantities. Notice that you cannot order more than the available stock.
5.  Click **Create Order**. You will be automatically redirected to the **Orders** tab with your new order selected.

### Step 3: Manage the Order

1.  In the **Orders** tab, your new order `ORDER-001` will be selected and have a `pending` status.
2.  Click the **Confirm Order** button.
    *   The order status will change to `confirmed`.
    *   The inventory for the products will be deducted.
3.  Now that the order is confirmed, you can perform a **partial cancellation**. Click the **Cancel Item** button next to one of the products in the order.
    *   The item will be removed from the order.
    *   The order's total amount will be updated.
    *   The stock for that item will be restored.
4.  Finally, click the **Cancel Order** button to cancel the entire order.

### Step 4: Check the Logs and Dashboard

1.  Navigate to the **Activity Log** tab. You will see a complete timeline of every action you just took (Order Created, Confirmed, Item Cancelled, Inventory Deducted, etc.).
2.  Navigate to the **Dashboard**. You will see updated stats for Total Orders, Revenue (from your confirmed order before you cancelled it), and any Low Stock items.

## 4. Backend Configuration

### API URL
If the backend is running on a different port, the **only** place you need to change the URL is in this file:
`frontend/src/apiConfig.js`

### Database
The project uses SQLite for development. The database file is created automatically at `backend/db.sqlite3`.

To connect with a database client like TablePlus:
1.  Choose **SQLite** as the connection type.
2.  Set the database file path to the absolute path of `backend/db.sqlite3`.


