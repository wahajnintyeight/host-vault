import CryptoJS from 'crypto-js';
import type { EncryptedData } from '../../types';
import { ENCRYPTION_CONFIG } from '../constants';

/**
 * Encrypt data using AES-256-GCM
 * Note: CryptoJS doesn't support GCM mode directly, so we use AES-256-CBC with HMAC
 * For true GCM support, use Web Crypto API (requires HTTPS/localhost)
 */
export function encryptData(
  data: string,
  key: string
): EncryptedData {
  try {
    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.IV_LENGTH);
    
    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(key), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Generate HMAC for authentication (simulating GCM tag)
    const hmac = CryptoJS.HmacSHA256(
      encrypted.ciphertext.toString(CryptoJS.enc.Base64),
      CryptoJS.enc.Hex.parse(key)
    );

    return {
      data: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
      iv: iv.toString(CryptoJS.enc.Hex),
      salt: '', // Not needed when key is already derived
      tag: hmac.toString(CryptoJS.enc.Hex),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(
  encryptedData: EncryptedData,
  key: string
): string {
  try {
    // Verify HMAC (authentication tag)
    if (!encryptedData.tag) {
      throw new Error('Missing authentication tag');
    }
    
    const hmac = CryptoJS.HmacSHA256(
      encryptedData.data,
      CryptoJS.enc.Hex.parse(key)
    );

    if (hmac.toString(CryptoJS.enc.Hex) !== encryptedData.tag) {
      throw new Error('Authentication failed: Data may have been tampered with');
    }

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(
      {
        ciphertext: CryptoJS.enc.Base64.parse(encryptedData.data),
      } as any,
      CryptoJS.enc.Hex.parse(key),
      {
        iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }

    return decryptedText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt SSH private key
 */
export function encryptPrivateKey(
  privateKey: string,
  encryptionKey: string
): EncryptedData {
  return encryptData(privateKey, encryptionKey);
}

/**
 * Decrypt SSH private key
 */
export function decryptPrivateKey(
  encryptedKey: EncryptedData,
  encryptionKey: string
): string {
  return decryptData(encryptedKey, encryptionKey);
}

/**
 * Encrypt password
 */
export function encryptPassword(
  password: string,
  encryptionKey: string
): EncryptedData {
  return encryptData(password, encryptionKey);
}

/**
 * Decrypt password
 */
export function decryptPassword(
  encryptedPassword: EncryptedData,
  encryptionKey: string
): string {
  return decryptData(encryptedPassword, encryptionKey);
}

/**
 * Generate random encryption key (for testing/dev purposes)
 */
export function generateRandomKey(): string {
  return CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.KEY_LENGTH / 8)
    .toString(CryptoJS.enc.Hex);
}

/**
 * Derive encryption key from a keyphrase using PBKDF2
 */
export function deriveKeyFromKeyphrase(keyphrase: string, salt?: string): string {
  // Generate salt if not provided, or parse hex string to WordArray
  const saltToUse = salt
    ? CryptoJS.enc.Hex.parse(salt)
    : CryptoJS.lib.WordArray.random(128/8);
  
  // Derive key using PBKDF2 with 10000 iterations
  const key = CryptoJS.PBKDF2(keyphrase, saltToUse, {
    keySize: ENCRYPTION_CONFIG.KEY_LENGTH / 32, // 256 bits = 8 words (32 bits each)
    iterations: 10000,
  });
  
  return key.toString(CryptoJS.enc.Hex);
}

/**
 * Encrypt data using a keyphrase (derives key internally)
 */
export function encryptDataWithKeyphrase(
  data: string,
  keyphrase: string
): EncryptedData & { salt: string } {
  // Generate salt for this encryption
  const salt = CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Hex);
  
  // Derive key from keyphrase
  const key = deriveKeyFromKeyphrase(keyphrase, salt);
  
  // Encrypt using derived key
  const encrypted = encryptData(data, key);
  
  return {
    ...encrypted,
    salt: salt,
  };
}

/**
 * Decrypt data using a keyphrase (derives key internally)
 */
export function decryptDataWithKeyphrase(
  encryptedData: EncryptedData & { salt: string },
  keyphrase: string
): string {
  // Derive key from keyphrase using the salt from encrypted data
  const key = deriveKeyFromKeyphrase(keyphrase, encryptedData.salt);
  
  // Decrypt using derived key
  return decryptData(encryptedData, key);
}

/**
 * Web Crypto API wrapper (for true AES-GCM support when available)
 * Falls back to CryptoJS if Web Crypto API is not available
 */
export async function encryptDataWebCrypto(
  data: string,
  key: CryptoKey
): Promise<EncryptedData> {
  if (!window.crypto || !window.crypto.subtle) {
    // Fallback to CryptoJS
    const keyHex = await cryptoKeyToHex(key);
    return encryptData(data, keyHex);
  }

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.TAG_LENGTH * 8, // Convert bytes to bits
      },
      key,
      dataBuffer
    );

    // Extract tag from encrypted data (last TAG_LENGTH bytes)
    const encryptedArray = new Uint8Array(encrypted);
    const tagLength = ENCRYPTION_CONFIG.TAG_LENGTH;
    const ciphertext = encryptedArray.slice(0, -tagLength);
    const tag = encryptedArray.slice(-tagLength);

    return {
      data: btoa(String.fromCharCode(...ciphertext)),
      iv: Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
      salt: '',
      tag: Array.from(tag)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    };
  } catch (error) {
    console.error('Web Crypto encryption error:', error);
    throw new Error('Failed to encrypt data with Web Crypto API');
  }
}

/**
 * Decrypt using Web Crypto API
 */
export async function decryptDataWebCrypto(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    // Fallback to CryptoJS
    const keyHex = await cryptoKeyToHex(key);
    return decryptData(encryptedData, keyHex);
  }

  try {
    const iv = Uint8Array.from(
      encryptedData.iv.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    if (!encryptedData.tag) {
      throw new Error('Missing authentication tag');
    }
    const tag = Uint8Array.from(
      encryptedData.tag.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const ciphertext = Uint8Array.from(
      atob(encryptedData.data),
      (c) => c.charCodeAt(0)
    );

    // Combine ciphertext and tag for GCM
    const encrypted = new Uint8Array(ciphertext.length + tag.length);
    encrypted.set(ciphertext);
    encrypted.set(tag, ciphertext.length);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.TAG_LENGTH * 8,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Web Crypto decryption error:', error);
    throw new Error('Failed to decrypt data with Web Crypto API');
  }
}

/**
 * Helper to convert CryptoKey to hex string (for fallback)
 */
async function cryptoKeyToHex(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  const array = new Uint8Array(exported);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

