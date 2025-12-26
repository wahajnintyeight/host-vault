import apiClient, { handleApiResponse } from './client';
import { API_ENDPOINTS } from '../constants';
import type { AuthResponse, User, RecoveryCodeResponse } from '../../types';

/**
 * Initiate Google OAuth login
 */
export async function initiateGoogleOAuth(): Promise<string> {
  // This should redirect to Google OAuth or return the OAuth URL
  const response = await apiClient.get<{ url: string }>(API_ENDPOINTS.AUTH.GOOGLE_CALLBACK);
  return response.data.url;
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(code: string): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>(
    API_ENDPOINTS.AUTH.GOOGLE_CALLBACK,
    { code }
  );
  return handleApiResponse(response);
}

/**
 * Get current session
 */
export async function getSession(): Promise<User> {
  const response = await apiClient.get<{ data: User }>(API_ENDPOINTS.AUTH.SESSION);
  return handleApiResponse(response);
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>(
    API_ENDPOINTS.AUTH.REFRESH,
    { refreshToken }
  );
  return handleApiResponse(response);
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
}

/**
 * Reset password using recovery code
 */
export async function resetPasswordWithCode(
  code: string,
  newMasterPassword: string
): Promise<void> {
  await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD_CODE, {
    code,
    newMasterPassword,
  });
}

/**
 * Generate recovery codes (for initial setup)
 */
export async function generateRecoveryCodes(): Promise<RecoveryCodeResponse> {
  const response = await apiClient.post<{ data: RecoveryCodeResponse }>(
    '/auth/recovery-codes/generate'
  );
  return handleApiResponse(response);
}

