import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Change this to the machine's IP address when testing on a physical device
// Use 10.0.2.2 for Android Emulator, localhost for iOS simulator
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api/v1';

const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
