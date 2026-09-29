import crypto from 'crypto';

// AES-256-GCM encryption requires a 32-byte key
// We expect ENCRYPTION_KEY to be a 64-character hex string or 32-character plaintext string.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const VERSION = 'v1';

function getKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Cannot perform secure encryption operations.');
  }

  // If the key is a 64-character hex string, parse it as hex
  if (keyStr.length === 64 && /^[0-9a-fA-F]+$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex');
  }

  // If the key is exactly 32 bytes
  if (Buffer.from(keyStr).length === 32) {
    return Buffer.from(keyStr);
  }

  throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters or 32 plaintext characters).');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a formatted string: v1:<iv>:<authTag>:<ciphertext>
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a formatted string: v1:<iv>:<authTag>:<ciphertext> back to plaintext.
 */
export function decryptSecret(encryptedPayload: string): string {
  const key = getKey();
  
  const parts = encryptedPayload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid encrypted payload format or unsupported version.');
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
