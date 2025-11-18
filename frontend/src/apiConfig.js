const isDevelopment = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
    ? 'http://localhost:8000' 
    : ''; // In production, relative paths will work if served from the same domain
