import { createClient } from '@supabase/supabase-js';
import {
  authenticateSupabaseUser,
  decryptToken,
  revokeGoogleToken,
} from './oauthSecurity';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // 1. Authenticate calling user
  const authResult = await authenticateSupabaseUser(req);
  let userId = authResult.userId;

  let body: any = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  // Only allow explicit body.userId in dev/demo environments if unauthenticated
  if (!userId) {
    if (process.env.NODE_ENV !== 'production' && body.userId) {
      userId = body.userId;
    } else {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized. Valid session required to disconnect.' }));
      return;
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let revocationResult = { success: true };
  const force = body.force === true || req.query?.force === 'true';

  if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // 2. Fetch stored encrypted token to revoke with Google
      let rawToken: string | null = null;
      try {
        const { data: tokenRow } = await supabaseAdmin
          .from('calendar_tokens')
          .select('encrypted_refresh_token, encrypted_access_token')
          .eq('user_id', userId)
          .maybeSingle();

        if (tokenRow) {
          rawToken =
            (tokenRow.encrypted_refresh_token ? decryptToken(tokenRow.encrypted_refresh_token) : null) ||
            (tokenRow.encrypted_access_token ? decryptToken(tokenRow.encrypted_access_token) : null);

          if (rawToken) {
            revocationResult = await revokeGoogleToken(rawToken);
          }
        }
      } catch (vaultErr) {
        // Vault table might not yet exist or query error
        console.warn('Notice reading calendar_tokens vault during disconnect:', vaultErr);
      }

      // If token revocation failed at Google and force was NOT requested:
      // DO NOT delete tokens from vault so that disconnection remains retryable
      // and does NOT produce a misleading success message.
      if (!revocationResult.success && !force) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            revoked: false,
            retryable: true,
            error: 'Failed to revoke token with Google servers. Your local tokens have been preserved so you can retry.',
            details: (revocationResult as any).error,
          })
        );
        return;
      }

      // Delete from server token vault
      try {
        await supabaseAdmin.from('calendar_tokens').delete().eq('user_id', userId);
      } catch {
        // ignore
      }

      // 3. Delete connection record from Supabase
      await supabaseAdmin.from('calendar_connections').delete().eq('user_id', userId);
    } catch (err: any) {
      console.warn('Error during calendar disconnect cleanup:', err);
      if (!force) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            retryable: true,
            error: 'Server error during calendar disconnect cleanup.',
            details: err?.message,
          })
        );
        return;
      }
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      success: true,
      revoked: revocationResult.success,
      warning: revocationResult.success ? undefined : 'Token could not be confirmed revoked at Google, but local records were deleted.',
      message: 'Google Calendar disconnected.',
    })
  );
}
