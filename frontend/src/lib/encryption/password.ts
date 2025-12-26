import CryptoJS from 'crypto-js';
import { ENCRYPTION_CONFIG } from '../constants';

/**
 * Derive encryption key from master password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: string
): Promise<{ key: string; salt: string }> {
  const saltBytes = salt
    ? CryptoJS.enc.Hex.parse(salt)
    : CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.SALT_LENGTH);

  const key = CryptoJS.PBKDF2(password, saltBytes, {
    keySize: ENCRYPTION_CONFIG.KEY_LENGTH / 32, // Convert bits to words (32 bits per word)
    iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
  });

  return {
    key: key.toString(CryptoJS.enc.Hex),
    salt: saltBytes.toString(CryptoJS.enc.Hex),
  };
}

/**
 * Hash master password for storage (using bcrypt-like approach with PBKDF2)
 * Note: This is a simplified version. In production, use actual bcrypt or Argon2
 */
export async function hashMasterPassword(password: string): Promise<string> {
  const { key, salt } = await deriveKeyFromPassword(password);
  // Store as salt:hash format
  return `${salt}:${key}`;
}

/**
 * Verify master password against stored hash
 */
export async function verifyMasterPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [salt, expectedHash] = storedHash.split(':');
    const { key } = await deriveKeyFromPassword(password, salt);
    return key === expectedHash;
  } catch (error) {
    console.error('Error verifying master password:', error);
    return false;
  }
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
    feedback.push('Use at least 12 characters for better security');
  } else {
    feedback.push('Password is too short (minimum 12 characters)');
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add special characters');
  }

  // Complexity checks
  if (password.length >= 16) {
    score += 10;
  }

  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('Avoid repeating characters');
  }

  // Common patterns
  const commonPatterns = [
    /12345/,
    /password/i,
    /qwerty/i,
    /abc123/i,
  ];

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score -= 20;
    feedback.push('Avoid common patterns');
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  if (score >= 80) {
    feedback.unshift('Strong password');
  } else if (score >= 60) {
    feedback.unshift('Moderate password');
  } else if (score >= 40) {
    feedback.unshift('Weak password');
  } else {
    feedback.unshift('Very weak password');
  }

  return { score, feedback };
}

/**
 * Generate recovery code
 */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format as XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/**
 * Hash recovery code (SHA-256)
 */
export function hashRecoveryCode(code: string): string {
  return CryptoJS.SHA256(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).toString(
    CryptoJS.enc.Hex
  );
}

