import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
    withCredentials: true,
});

// Using secure HttpOnly cookies, so we don't need to manually inject Bearer auth tokens from localStorage anymore

export default api;
