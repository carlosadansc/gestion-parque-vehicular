/**
 * Password utility for hashing and verification
 * Uses SHA-256 with base64 encoding to match Google Sheets format
 */

/**
 * Hash a password using SHA-256 and encode as base64
 * @param password - Plain text password
 * @returns Base64 encoded SHA-256 hash
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return hashBase64;
};

/**
 * Verify a password against a stored hash
 * @param password - Plain text password to verify
 * @param storedHash - Base64 encoded SHA-256 hash to compare against
 * @returns True if password matches, false otherwise
 */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
};
