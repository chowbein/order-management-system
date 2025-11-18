import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import './ProductManagement.css';

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState(null);
    
    // Form state
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
        setShowForm(false);
    };

    const handleAddNew = () => {
        resetForm();
        setShowForm(true);
    };

    const handleEdit = (product) => {
        setFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            stock_quantity: product.stock_quantity
        });
        setEditingProduct(product);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        try {
            if (editingProduct) {
                // Update existing product
                await axios.put(`${API_BASE_URL}/api/products/${editingProduct.id}/`, formData);
                setMessage({ type: 'success', text: 'Product updated successfully!' });
            } else {
                // Create new product
                await axios.post(`${API_BASE_URL}/api/products/`, formData);
                setMessage({ type: 'success', text: 'Product created successfully!' });
            }
            
            resetForm();
            fetchProducts();
            setTimeout(() => setMessage(null), 3000);
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

            {/* Add/Edit Form */}
            {showForm && (
                <div className="pm-form-container">
                    <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="pm-form-grid">
                            <div className="pm-form-field">
                                <label>
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g., Laptop"
                                />
                            </div>
                            
                            <div className="pm-form-field">
                                <label>
                                    Price *
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g., 29.99"
                                />
                            </div>
                        </div>

                        <div className="pm-form-field">
                            <label>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="3"
                                placeholder="Product description..."
                            />
                        </div>

                        <div className="pm-form-field">
                            <label>
                                Stock Quantity *
                            </label>
                            <input
                                type="number"
                                name="stock_quantity"
                                value={formData.stock_quantity}
                                onChange={handleInputChange}
                                required
                                min="0"
                                placeholder="e.g., 100"
                                style={{ width: '200px' }}
                            />
                        </div>

                        <div className="pm-form-actions">
                            <button
                                type="submit"
                                className="pm-submit-btn"
                            >
                                {editingProduct ? 'Update Product' : 'Create Product'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="pm-cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

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

