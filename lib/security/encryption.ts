// ==========================================
// FIELD-LEVEL ENCRYPTION FOR SENSITIVE DATA
// ==========================================
// Encrypts: 2FA secrets, payment details, PII
// Uses AES-256-GCM with random IV

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// ==========================================
// CONFIG
// ==========================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// ==========================================
// GET ENCRYPTION KEY
// ==========================================

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;

  if (!secret) {
    // In development, use a deterministic key (NOT for production!)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Encryption] Using development key - NOT SECURE FOR PRODUCTION');
      return scryptSync('dev-only-key', 'dev-salt', KEY_LENGTH);
    }
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }

  // Derive a key from the secret using scrypt
  return scryptSync(secret, 'zalogche-v1', KEY_LENGTH);
}

// ==========================================
// ENCRYPT
// ==========================================

/**
 * Encrypt a string value
 * @param plaintext - The value to encrypt
 * @returns Encrypted value as base64 string (iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Encrypt error:', error);
    throw new Error('Encryption failed');
  }
}

// ==========================================
// DECRYPT
// ==========================================

/**
 * Decrypt an encrypted string value
 * @param encryptedValue - The encrypted value (iv:authTag:ciphertext)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;

  // Check if value looks encrypted (has the iv:authTag:ciphertext format)
  if (!encryptedValue.includes(':')) {
    // Not encrypted, return as-is (for migration purposes)
    return encryptedValue;
  }

  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, ciphertext] = encryptedValue.split(':');

    if (!ivHex || !authTagHex || !ciphertext) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decrypt error:', error);
    throw new Error('Decryption failed');
  }
}

// ==========================================
// ENCRYPT JSON (for payment details, etc.)
// ==========================================

/**
 * Encrypt a JSON object
 * @param data - Object to encrypt
 * @returns Encrypted JSON string
 */
export function encryptJson(data: object): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt a JSON object
 * @param encryptedValue - Encrypted JSON string
 * @returns Decrypted object
 */
export function decryptJson<T = any>(encryptedValue: string): T {
  const decrypted = decrypt(encryptedValue);
  return JSON.parse(decrypted);
}

// ==========================================
// HASH FOR BACKUP CODES (one-way)
// ==========================================

import { createHash } from 'crypto';

/**
 * Hash a backup code (one-way, for storage)
 * Backup codes should be hashed, not encrypted
 */
export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a backup code against a hash
 */
export function verifyBackupCode(code: string, hash: string): boolean {
  return hashBackupCode(code) === hash;
}

// ==========================================
// ENCRYPT SENSITIVE FIELDS
// ==========================================

/**
 * Encrypt specific fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as T[keyof T];
    } else if (result[field] && typeof result[field] === 'object') {
      result[field] = encryptJson(result[field]) as T[keyof T];
    }
  }

  return result;
}

/**
 * Decrypt specific fields in an object
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[],
  jsonFields: (keyof T)[] = []
): T {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      if (jsonFields.includes(field)) {
        result[field] = decryptJson(result[field] as string);
      } else {
        result[field] = decrypt(result[field] as string) as T[keyof T];
      }
    }
  }

  return result;
}

// ==========================================
// MIGRATION HELPER
// ==========================================

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  hashBackupCode,
  verifyBackupCode,
  encryptFields,
  decryptFields,
  isEncrypted,
};
