import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import Modal from './Modal';
import ProductForm from './ProductForm';
import './ProductManagement.css';

/**
 * ProductManagement Component
 * 
 * Full CRUD interface for product inventory:
 * - Create new products
 * - Read/display all products
 * - Update product details and stock
 * - Delete products
 * 
 * Features:
 * - Real-time search/filter
 * - Inline editing with modal form
 * - Stock level indicators (critical, low, good)
 * - Automatic inventory logging (handled by backend)
 * 
 * API Integration:
 * - GET /api/products/ - Fetch all products
 * - POST /api/products/ - Create new product
 * - PUT /api/products/{id}/ - Update product
 * - DELETE /api/products/{id}/ - Delete product
 */
const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [message, setMessage] = useState(null);
    
    // Form state for create/edit operations
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock_quantity: ''
    });

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/products/`);
            setProducts(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products. Please make sure the Django server is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            stock_quantity: ''
        });
        setEditingProduct(null);
        setIsModalOpen(false);
    };

    const handleAddNew = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleEdit = (product) => {
        setFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            stock_quantity: product.stock_quantity
        });
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        try {
            if (editingProduct) {
                // Update mode: PUT request to update existing product
                // Backend automatically logs stock changes via InventoryLog
                await axios.put(`${API_BASE_URL}/api/products/${editingProduct.id}/`, formData);
                setMessage({ type: 'success', text: 'Product updated successfully!' });
            } else {
                // Create mode: POST request to create new product
                // Backend automatically creates initial inventory log
                await axios.post(`${API_BASE_URL}/api/products/`, formData);
                setMessage({ type: 'success', text: 'Product created successfully!' });
            }
            
            resetForm();
            fetchProducts();  // Refresh list to show changes
            setTimeout(() => setMessage(null), 3000);  // Auto-hide success message
        } catch (err) {
            console.error('Error saving product:', err);
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.detail || 'Failed to save product' 
            });
        }
    };

    const handleDelete = async (product) => {
        if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
            try {
                await axios.delete(`${API_BASE_URL}/api/products/${product.id}/`);
                setMessage({ type: 'success', text: 'Product deleted successfully!' });
                fetchProducts();
                setTimeout(() => setMessage(null), 3000);
            } catch (err) {
                console.error('Error deleting product:', err);
                setMessage({ 
                    type: 'error', 
                    text: 'Failed to delete product' 
                });
            }
        }
    };

    if (loading) {
        return <div className="loading-message">Loading products...</div>;
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="product-management">
            <div className="pm-header">
                <h2>Product Management</h2>
                <div className="pm-header-actions">
                    <input
                        type="text"
                        placeholder="Search by product name..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pm-search-input"
                    />
                    <button
                        onClick={handleAddNew}
                        className="pm-add-btn"
                    >
                        + Add New Product
                    </button>
                </div>
            </div>

            {message && (
                <div className={`pm-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {error && (
                <div className="pm-message error">
                    {error}
                </div>
            )}

            {/* Add/Edit Product Modal */}
            <Modal isOpen={isModalOpen} onClose={resetForm}>
                <ProductForm
                    formData={formData}
                    onInputChange={handleInputChange}
                    onSubmit={handleSubmit}
                    onCancel={resetForm}
                    editingProduct={editingProduct}
                />
            </Modal>

            {/* Products Table */}
            <div className="pm-table-container">
                {filteredProducts.length === 0 ? (
                    <div className="no-products-message">
                        <div className="icon">📦</div>
                        <div className="title">No products found</div>
                        <div className="subtitle">Click "Add New Product" to get started</div>
                    </div>
                ) : (
                    <table className="pm-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        {product.name}
                                    </td>
                                    <td style={{ color: '#666', maxWidth: '300px' }}>
                                        {product.description || '-'}
                                    </td>
                                    <td className="price">
                                        ₱{parseFloat(product.price).toFixed(2)}
                                    </td>
                                    <td className={`stock ${product.stock_quantity < 10 ? 'low' : ''}`}>
                                        {product.stock_quantity}
                                    </td>
                                    <td className="pm-table-actions">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="pm-edit-btn"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product)}
                                            className="pm-delete-btn"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="pm-footer">
                Total Products: {filteredProducts.length}
            </div>
        </div>
    );
};

export default ProductManagement;

