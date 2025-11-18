import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

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
        return <div style={{ padding: '20px' }}>Loading products...</div>;
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '20px', maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Product Management</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="Search by product name..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px', width: '250px' }}
                    />
                    <button
                        onClick={handleAddNew}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        + Add New Product
                    </button>
                </div>
            </div>

            {message && (
                <div style={{
                    padding: '10px',
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828',
                    marginBottom: '15px',
                    borderRadius: '4px'
                }}>
                    {message.text}
                </div>
            )}

            {error && (
                <div style={{ padding: '20px', color: '#c62828', backgroundColor: '#ffebee', borderRadius: '4px', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
                <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px',
                    border: '2px solid #2196F3'
                }}>
                    <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    style={{ padding: '10px', width: '100%', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    placeholder="e.g., Laptop"
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                                    style={{ padding: '10px', width: '100%', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    placeholder="e.g., 29.99"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="3"
                                style={{ padding: '10px', width: '100%', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                                placeholder="Product description..."
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Stock Quantity *
                            </label>
                            <input
                                type="number"
                                name="stock_quantity"
                                value={formData.stock_quantity}
                                onChange={handleInputChange}
                                required
                                min="0"
                                style={{ padding: '10px', width: '200px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                                placeholder="e.g., 100"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '10px 30px',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {editingProduct ? 'Update Product' : 'Create Product'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{
                                    padding: '10px 30px',
                                    backgroundColor: '#757575',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Products Table */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                {filteredProducts.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                        <div style={{ fontSize: '18px' }}>No products found</div>
                        <div style={{ fontSize: '14px', marginTop: '5px' }}>Click "Add New Product" to get started</div>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2196F3', color: 'white' }}>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>Price</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Stock</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product, index) => (
                                <tr 
                                    key={product.id}
                                    style={{ 
                                        backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                                        borderBottom: '1px solid #e0e0e0'
                                    }}
                                >
                                    <td style={{ padding: '15px', fontWeight: '500' }}>
                                        {product.name}
                                    </td>
                                    <td style={{ padding: '15px', color: '#666', maxWidth: '300px' }}>
                                        {product.description || '-'}
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#4CAF50' }}>
                                        ₱{parseFloat(product.price).toFixed(2)}
                                    </td>
                                    <td style={{ 
                                        padding: '15px', 
                                        textAlign: 'center',
                                        color: product.stock_quantity < 10 ? '#f44336' : '#4CAF50',
                                        fontWeight: 'bold'
                                    }}>
                                        {product.stock_quantity}
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleEdit(product)}
                                            style={{
                                                padding: '6px 15px',
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                marginRight: '5px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product)}
                                            style={{
                                                padding: '6px 15px',
                                                backgroundColor: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
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

            <div style={{ 
                marginTop: '20px', 
                textAlign: 'right', 
                color: '#999', 
                fontSize: '14px' 
            }}>
                Total Products: {filteredProducts.length}
            </div>
        </div>
    );
};

export default ProductManagement;

