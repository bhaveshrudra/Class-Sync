import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const ALLOWED_RETURN_PATHS = [
  '/student',
  '/student/profile',
  '/student/upcoming',
  '/student/calendar',
] as const;

export function sanitizeReturnTo(path?: string | null): string {
  if (!path || typeof path !== 'string') return '/student/profile';
  // Strip query/hash and whitespace
  const cleanPath = path.trim().split('?')[0].split('#')[0];
  if ((ALLOWED_RETURN_PATHS as readonly string[]).includes(cleanPath)) {
    return cleanPath;
  }
  return '/student/profile';
}

function getStateSigningSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'classsync_oauth_state_hmac_secret_fallback_key_2026'
  );
}

export interface StatePayload {
  userId: string;
  returnTo: string;
  nonce: string;
  exp: number;
}

/**
 * Creates a cryptographically signed OAuth state parameter
 * bound to the authenticated user ID and return path.
 */
export function createSecureOAuthState(userId: string, returnTo: string): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
  const sanitizedPath = sanitizeReturnTo(returnTo);

  const payload: StatePayload = {
    userId,
    returnTo: sanitizedPath,
    nonce,
    exp,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', getStateSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  const state = `${payloadB64}.${signature}`;
  return { state, nonce };
}

/**
 * Validates a cryptographically signed OAuth state parameter.
 * Protects against CSRF, tampering, and replay.
 */
export function verifyOAuthState(stateString?: string | null): {
  valid: boolean;
  payload?: StatePayload;
  error?: string;
} {
  if (!stateString || typeof stateString !== 'string') {
    return { valid: false, error: 'missing_state' };
  }

  const parts = stateString.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'malformed_state' };
  }

  const [payloadB64, signature] = parts;

  // Verify HMAC signature in constant time
  const expectedSignature = crypto
    .createHmac('sha256', getStateSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
  const actualBuf = Buffer.from(signature, 'utf-8');

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, error: 'invalid_signature' };
  }

  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: StatePayload = JSON.parse(payloadStr);

    // Verify expiration
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, error: 'expired_state' };
    }

    // Verify required fields
    if (!payload.userId || !payload.nonce) {
      return { valid: false, error: 'invalid_payload' };
    }

    // Ensure returnTo is strictly allowed
    payload.returnTo = sanitizeReturnTo(payload.returnTo);

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'unparseable_payload' };
  }
}

const ENCRYPTION_ALGO = 'aes-256-gcm';
export const DEV_FALLBACK_ENCRYPTION_KEY = 'classsync_dev_encryption_key_32b_0123456789abcdef';

/**
 * Resolves a 32-byte (256-bit) buffer from a given key string.
 * Supports 64-hex strings, 44-base64 strings, or strings of at least 32 UTF-8 bytes.
 */
export function resolveEncryptionKeyBuffer(rawKey: string): Buffer {
  const trimmed = rawKey.trim();
  // 1. 64-character hex string (32 bytes / 256 bits)
  if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  // 2. 44-character base64 string (32 bytes)
  if (trimmed.length === 44 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) return buf;
  }
  // 3. Raw string with at least 32 bytes of entropy
  const utf8Buf = Buffer.from(trimmed, 'utf8');
  if (utf8Buf.length >= 32) {
    return crypto.createHash('sha256').update(utf8Buf).digest();
  }
  throw new Error(
    `TOKEN_ENCRYPTION_KEY has insufficient cryptographic strength: must be at least 32 bytes or 64 hex characters (got ${utf8Buf.length} bytes).`
  );
}

/**
 * Validates TOKEN_ENCRYPTION_KEY configuration at startup.
 * Enforces strict presence and strength in production.
 * Never derives production key from rotating service-role keys or OAuth secrets.
 */
export function validateTokenEncryptionKey(): { valid: boolean; isDevFallback: boolean; error?: string } {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (!envKey) {
    if (isProd) {
      const err = '[FATAL] TOKEN_ENCRYPTION_KEY environment variable is required in production and cannot be empty.';
      console.error(err);
      throw new Error(err);
    }
    // In dev / test, warn once and permit deterministic fallback
    return { valid: true, isDevFallback: true };
  }

  try {
    resolveEncryptionKeyBuffer(envKey);
    return { valid: true, isDevFallback: false };
  } catch (err: any) {
    if (isProd) {
      console.error('[FATAL]', err.message);
      throw err;
    }
    console.warn('[WARN]', err.message, 'Using dev fallback key.');
    return { valid: false, isDevFallback: true, error: err.message };
  }
}

export function getEncryptionKey(): Buffer {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (envKey) {
    return resolveEncryptionKeyBuffer(envKey);
  }

  if (isProd) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required in production.');
  }

  return resolveEncryptionKeyBuffer(DEV_FALLBACK_ENCRYPTION_KEY);
}

// Validate encryption key at startup for server runtime (bypassed during static build)
const isStaticBuild =
  typeof process !== 'undefined' &&
  (process.env.npm_lifecycle_event === 'build' ||
    process.argv?.some((arg) => typeof arg === 'string' && (arg === 'build' || arg.includes('vite'))));

if (!isStaticBuild) {
  try {
    validateTokenEncryptionKey();
  } catch (startupErr) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw startupErr;
    }
  }
}

/**
 * Encrypts sensitive OAuth tokens at rest using AES-256-GCM.
 */
export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive OAuth tokens at rest using AES-256-GCM.
 */
export function decryptToken(cipherText?: string | null): string | null {
  if (!cipherText || typeof cipherText !== 'string') return null;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return null;
  }
}

/**
 * Authenticates a Supabase user from the incoming HTTP request.
 * Reads Authorization header or cookie and verifies the JWT against Supabase Auth.
 */
export async function authenticateSupabaseUser(req: any): Promise<{ userId: string | null; error?: string }> {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    let token: string | null = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token && req.cookies && req.cookies['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    }

    if (!token) {
      return { userId: null, error: 'No authorization token found' };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      return { userId: null, error: 'Supabase is not configured' };
    }

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      return { userId: null, error: error?.message || 'Invalid user token' };
    }

    return { userId: user.id };
  } catch (err: any) {
    return { userId: null, error: err.message };
  }
}

export interface RevokeTokenResult {
  success: boolean;
  alreadyRevoked?: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Revokes Google OAuth token with Google's revocation endpoint.
 * Returns structured result indicating success, already-revoked status, or failure.
 */
export async function revokeGoogleToken(token?: string | null): Promise<RevokeTokenResult> {
  if (!token) return { success: true };
  try {
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    // Google returns HTTP 400 with {"error": "invalid_token"} if the token is already expired or revoked.
    // In that case, the token is already inactive at Google, so revocation is effectively satisfied.
    if (response.status === 400) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {
        // ignore
      }
      if (bodyText.includes('invalid_token') || bodyText.includes('already')) {
        return { success: true, alreadyRevoked: true, statusCode: 400 };
      }
    }

    return {
      success: false,
      statusCode: response.status,
      error: `Google revocation endpoint returned status ${response.status}`,
    };
  } catch (err: any) {
    console.warn('Google token revocation network error:', err);
    return {
      success: false,
      error: err.message || 'Network error reaching Google revocation endpoint',
    };
  }
}
