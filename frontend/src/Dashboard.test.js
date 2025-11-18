import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Dashboard from './Dashboard';

jest.mock('axios');

describe('Dashboard Component', () => {
    const mockDashboardData = {
        total_orders: 25,
        total_revenue: 5432.50,
        low_stock_products: [
            { id: 1, name: '4K Monitor', stock_quantity: 2, price: '350.00' },
            { id: 2, name: 'USB-C Hub', stock_quantity: 5, price: '45.99' }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({ data: mockDashboardData });
    });

    test('renders dashboard title', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });
    });

    test('displays loading state initially', () => {
        axios.get.mockImplementation(() => new Promise(() => {}));
        
        render(<Dashboard />);
        
        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    test('fetches and displays dashboard statistics', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/dashboard/')
            );
        });
    });

    test('displays total orders count', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('25')).toBeInTheDocument();
            expect(screen.getByText('Total Orders')).toBeInTheDocument();
        });
    });

    test('displays total revenue', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('₱5432.50')).toBeInTheDocument();
            expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        });
    });

    test('displays low stock alert count', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
        });
    });

    test('displays low stock products table', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('Low Stock Products')).toBeInTheDocument();
            expect(screen.getByText('4K Monitor')).toBeInTheDocument();
            expect(screen.getByText('USB-C Hub')).toBeInTheDocument();
        });
    });

    test('shows success message when no low stock products', async () => {
        axios.get.mockResolvedValue({
            data: {
                total_orders: 10,
                total_revenue: 1000.00,
                low_stock_products: []
            }
        });
        
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText(/All products are well stocked/i)).toBeInTheDocument();
        });
    });

    test('displays error message on fetch failure', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));
        
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
        });
    });

    test('refresh button refetches data', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('25')).toBeInTheDocument();
        });
        
        // Clear previous calls
        axios.get.mockClear();
        
        // Mock new data
        axios.get.mockResolvedValue({
            data: {
                ...mockDashboardData,
                total_orders: 30
            }
        });
        
        // Click refresh
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
    });

    test('displays stock quantities correctly', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('4K Monitor')).toBeInTheDocument();
        });
        
        // Check stock quantities are displayed
        expect(screen.getAllByText('2').length).toBeGreaterThan(0);
        expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });

    test('displays product prices', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('₱350.00')).toBeInTheDocument();
            expect(screen.getByText('₱45.99')).toBeInTheDocument();
        });
    });

    test('shows LOW STOCK badge for products with stock > 0', async () => {
        render(<Dashboard />);
        
        await waitFor(() => {
            const lowStockBadges = screen.getAllByText('LOW STOCK');
            expect(lowStockBadges.length).toBeGreaterThan(0);
        });
    });

    test('shows OUT OF STOCK badge for products with stock = 0', async () => {
        axios.get.mockResolvedValue({
            data: {
                ...mockDashboardData,
                low_stock_products: [
                    { id: 1, name: 'Empty Product', stock_quantity: 0, price: '100.00' }
                ]
            }
        });
        
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('OUT OF STOCK')).toBeInTheDocument();
        });
    });

    test('handles zero revenue correctly', async () => {
        axios.get.mockResolvedValue({
            data: {
                total_orders: 5,
                total_revenue: 0,
                low_stock_products: []
            }
        });
        
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('₱0.00')).toBeInTheDocument();
        });
    });

    test('formats large revenue numbers correctly', async () => {
        axios.get.mockResolvedValue({
            data: {
                total_orders: 100,
                total_revenue: 123456.78,
                low_stock_products: []
            }
        });
        
        render(<Dashboard />);
        
        await waitFor(() => {
            expect(screen.getByText('₱123456.78')).toBeInTheDocument();
        });
    });
});

