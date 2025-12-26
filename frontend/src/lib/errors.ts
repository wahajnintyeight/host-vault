import type { AppError } from '../types';

/**
 * Custom error class for application errors
 */
export class AppErrorClass extends Error {
  code: string;
  details?: any;
  timestamp: string;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  
  // Master password errors
  MASTER_PASSWORD_REQUIRED: 'MASTER_PASSWORD_REQUIRED',
  MASTER_PASSWORD_INVALID: 'MASTER_PASSWORD_INVALID',
  MASTER_PASSWORD_NOT_SET: 'MASTER_PASSWORD_NOT_SET',
  
  // Recovery code errors
  RECOVERY_CODE_INVALID: 'RECOVERY_CODE_INVALID',
  RECOVERY_CODE_USED: 'RECOVERY_CODE_USED',
  RECOVERY_CODE_LOCKED: 'RECOVERY_CODE_LOCKED',
  
  // Encryption errors
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  INVALID_ENCRYPTION_KEY: 'INVALID_ENCRYPTION_KEY',
  
  // Connection errors
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',
  CONNECTION_CREATE_FAILED: 'CONNECTION_CREATE_FAILED',
  CONNECTION_UPDATE_FAILED: 'CONNECTION_UPDATE_FAILED',
  CONNECTION_DELETE_FAILED: 'CONNECTION_DELETE_FAILED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CORRUPTED: 'DATABASE_CORRUPTED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Format error message for display
 */
export function formatError(error: Error | AppErrorClass | unknown): string {
  if (error instanceof AppErrorClass) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error | AppErrorClass | unknown): string {
  if (error instanceof AppErrorClass) {
    const code = error.code;
    
    switch (code) {
      case ERROR_CODES.AUTH_REQUIRED:
        return 'Please log in to continue';
      case ERROR_CODES.AUTH_FAILED:
        return 'Login failed. Please check your credentials and try again';
      case ERROR_CODES.AUTH_TOKEN_EXPIRED:
        return 'Your session has expired. Please log in again';
      case ERROR_CODES.MASTER_PASSWORD_INVALID:
        return 'Incorrect master password. Please try again';
      case ERROR_CODES.MASTER_PASSWORD_NOT_SET:
        return 'Master password is not set. Please set it up first';
      case ERROR_CODES.RECOVERY_CODE_INVALID:
        return 'Invalid recovery code. Please check and try again';
      case ERROR_CODES.RECOVERY_CODE_USED:
        return 'This recovery code has already been used';
      case ERROR_CODES.RECOVERY_CODE_LOCKED:
        return 'This recovery code is locked due to too many failed attempts';
      case ERROR_CODES.ENCRYPTION_FAILED:
        return 'Failed to encrypt data. Please try again';
      case ERROR_CODES.DECRYPTION_FAILED:
        return 'Failed to decrypt data. The data may be corrupted or the key is incorrect';
      case ERROR_CODES.NETWORK_ERROR:
        return 'Network error. Please check your internet connection';
      case ERROR_CODES.API_ERROR:
        return 'Server error. Please try again later';
      case ERROR_CODES.TIMEOUT_ERROR:
        return 'Request timed out. Please try again';
      case ERROR_CODES.STORAGE_ERROR:
        return 'Storage error. Please check your browser settings';
      case ERROR_CODES.DATABASE_CORRUPTED:
        return 'Database is corrupted. Attempting to repair...';
      case ERROR_CODES.VALIDATION_ERROR:
        return 'Invalid input. Please check your data and try again';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
  
  return formatError(error);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error | AppErrorClass | unknown): boolean {
  if (error instanceof AppErrorClass) {
    const retryableCodes = [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.API_ERROR,
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_CODES.STORAGE_ERROR,
    ];
    return retryableCodes.includes(error.code as any);
  }
  
  return false;
}

