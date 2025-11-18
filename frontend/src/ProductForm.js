import React from 'react';
import './ProductForm.css';

/**
 * ProductForm Component
 * 
 * A reusable form for creating and editing products.
 * It is displayed within a modal in the ProductManagement component.
 * 
 * Props:
 * - `formData`: An object containing the current values for the form fields (name, description, etc.).
 * - `onInputChange`: A function to handle input changes and update the form state.
 * - `onSubmit`: A function to handle the form submission.
 * - `onCancel`: A function to handle the cancellation action, typically closing the modal.
 * - `editingProduct`: The product object being edited, or null if creating a new product. This is used to adjust labels and button text.
 */
const ProductForm = ({ formData, onInputChange, onSubmit, onCancel, editingProduct }) => {
    return (
        <div className="product-form-container">
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={onSubmit}>
                <div className="pm-form-grid">
                    <div className="pm-form-field">
                        <label>
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={onInputChange}
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
                            onChange={onInputChange}
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
                        onChange={onInputChange}
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
                        onChange={onInputChange}
                        required
                        min="0"
                        placeholder="e.g., 100"
                        style={{ width: '200px' }}
                    />
                </div>

                <div className="pm-form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="pm-cancel-btn"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="pm-submit-btn"
                    >
                        {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
