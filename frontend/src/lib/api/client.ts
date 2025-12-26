import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import type { ApiResponse } from '../../types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse<any>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          useAuthStore.getState().setAuth({
            user: useAuthStore.getState().user!,
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: response.data.data.expiresIn || 3600,
          });

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // Show toast notification for errors
    useAppStore.getState().addToast({
      type: 'error',
      title: 'Request Failed',
      message: errorMessage,
    });

    return Promise.reject(error);
  }
);

export default apiClient;

// Helper function to handle API responses
// Accepts AxiosResponse or plain response object
export function handleApiResponse<T>(response: any): T {
  // Extract data from Axios response
  const responseData = response?.data ?? response;
  
  // Check if response follows ApiResponse format (has 'success' property)
  if (responseData && typeof responseData === 'object' && 'success' in responseData) {
    const apiResponse = responseData as ApiResponse<T>;
    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Request failed');
    }
    if (!apiResponse.data) {
      throw new Error('No data returned from API');
    }
    return apiResponse.data;
  }
  
  // If responseData has a 'data' property, extract it (for wrapped responses)
  if (responseData && typeof responseData === 'object' && 'data' in responseData && !('success' in responseData)) {
    return (responseData as { data: T }).data;
  }
  
  // Otherwise, assume the data is directly the response
  return responseData as T;
}

