import axios from 'axios';

const api = axios.create({
  baseURL: 'https://safecity-backend.vercel.app/api',
  withCredentials: true, // Required for httpOnly cookie auth
});

export default api;
