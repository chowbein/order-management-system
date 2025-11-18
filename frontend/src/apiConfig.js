/**
 * API Configuration
 * 
 * Central configuration for backend API endpoints.
 * Change this file if backend runs on different host/port.
 * 
 * Development: Points to localhost:8000 (Django dev server)
 * Production: Uses relative paths (assumes frontend and backend on same domain)
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
    ? 'http://localhost:8000'  // Local Django server
    : '';  // Relative paths for production (e.g., /api/products/)
