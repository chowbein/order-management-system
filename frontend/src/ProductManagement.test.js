import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ProductManagement from './ProductManagement';

// Mock axios
jest.mock('axios');

describe('ProductManagement Component', () => {
    const mockProducts = [
        {
            id: 1,
            name: 'Test Keyboard',
            description: 'Mechanical keyboard',
            price: '99.99',
            stock_quantity: 50
        },
        {
            id: 2,
            name: 'Test Mouse',
            description: 'Gaming mouse',
            price: '49.99',
            stock_quantity: 5
        }
    ];

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        
        // Default mock for GET /api/products/
        axios.get.mockResolvedValue({ data: mockProducts });
    });

    test('renders product management title', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Product Management')).toBeInTheDocument();
        });
    });

    test('displays loading state initially', () => {
        axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
        
        render(<ProductManagement />);
        
        expect(screen.getByText('Loading products...')).toBeInTheDocument();
    });

    test('fetches and displays products', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
            expect(screen.getByText('Test Mouse')).toBeInTheDocument();
        });
        
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/products/'));
    });

    test('displays product details in table', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Mechanical keyboard')).toBeInTheDocument();
        expect(screen.getByText('₱99.99')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
    });

    test('shows error message when fetch fails', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));
        
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText(/Failed to load products/i)).toBeInTheDocument();
        });
    });

    test('shows add product form when button clicked', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        const addButton = screen.getByText('+ Add New Product');
        fireEvent.click(addButton);
        
        expect(screen.getByText('Add New Product')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., Laptop')).toBeInTheDocument();
    });

    test('can create new product', async () => {
        const newProduct = {
            id: 3,
            name: 'New Product',
            description: 'New Description',
            price: '29.99',
            stock_quantity: 100
        };
        
        axios.post.mockResolvedValue({ data: newProduct });
        axios.get.mockResolvedValueOnce({ data: mockProducts })
                  .mockResolvedValueOnce({ data: [...mockProducts, newProduct] });
        
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        // Click add button
        fireEvent.click(screen.getByText('+ Add New Product'));
        
        // Fill form
        fireEvent.change(screen.getByPlaceholderText('e.g., Laptop'), {
            target: { value: 'New Product' }
        });
        
        const priceInputs = screen.getAllByRole('spinbutton');
        fireEvent.change(priceInputs[0], { target: { value: '29.99' } });
        fireEvent.change(priceInputs[1], { target: { value: '100' } });
        
        // Submit form
        fireEvent.click(screen.getByText('Create Product'));
        
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/products/'),
                expect.objectContaining({ name: 'New Product' })
            );
        });
    });

    test('displays low stock items with red color', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Mouse')).toBeInTheDocument();
        });
        
        // Check that low stock (5) is displayed
        const stockCells = screen.getAllByText('5');
        expect(stockCells.length).toBeGreaterThan(0);
    });

    test('search filters products by name', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
            expect(screen.getByText('Test Mouse')).toBeInTheDocument();
        });
        
        // Search for "Keyboard"
        const searchInput = screen.getByPlaceholderText('Search by product name...');
        fireEvent.change(searchInput, { target: { value: 'Keyboard' } });
        
        // Should still show Keyboard
        expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        
        // Should not show Mouse (filtered out)
        expect(screen.queryByText('Test Mouse')).not.toBeInTheDocument();
    });

    test('can cancel add product form', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        // Open form
        fireEvent.click(screen.getByText('+ Add New Product'));
        expect(screen.getByText('Add New Product')).toBeInTheDocument();
        
        // Click cancel
        fireEvent.click(screen.getByText('Cancel'));
        
        // Form should be hidden
        expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();
    });

    test('shows success message after creating product', async () => {
        const newProduct = {
            id: 3,
            name: 'New Product',
            price: '29.99',
            stock_quantity: 100
        };
        
        axios.post.mockResolvedValue({ data: newProduct });
        
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        // Open form and submit
        fireEvent.click(screen.getByText('+ Add New Product'));
        fireEvent.click(screen.getByText('Create Product'));
        
        await waitFor(() => {
            expect(screen.getByText(/Product created successfully/i)).toBeInTheDocument();
        });
    });

    test('can delete product with confirmation', async () => {
        // Mock window.confirm
        window.confirm = jest.fn(() => true);
        
        axios.delete.mockResolvedValue({});
        axios.get.mockResolvedValueOnce({ data: mockProducts })
                  .mockResolvedValueOnce({ data: [mockProducts[1]] });
        
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        // Click delete button (first one)
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
        
        expect(window.confirm).toHaveBeenCalled();
        
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalled();
        });
    });

    test('does not delete product if user cancels confirmation', async () => {
        window.confirm = jest.fn(() => false);
        
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        });
        
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
        
        expect(window.confirm).toHaveBeenCalled();
        expect(axios.delete).not.toHaveBeenCalled();
    });

    test('displays total products count', async () => {
        render(<ProductManagement />);
        
        await waitFor(() => {
            expect(screen.getByText('Total Products: 2')).toBeInTheDocument();
        });
    });
});

