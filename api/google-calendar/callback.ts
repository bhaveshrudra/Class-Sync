import { createClient } from '@supabase/supabase-js';
import {
  verifyOAuthState,
  sanitizeReturnTo,
  encryptToken,
} from './oauthSecurity';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers?.host || 'localhost:3000'}`);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const stateParam = url.searchParams.get('state');

  // 1. Cryptographic state verification
  const stateVerification = verifyOAuthState(stateParam);
  let returnPath = '/student/profile';

  if (!stateVerification.valid || !stateVerification.payload) {
    console.warn('OAuth State validation failed:', stateVerification.error);
    res.statusCode = 302;
    res.setHeader('Location', `/student/profile?calendar_error=invalid_state`);
    res.end();
    return;
  }

  const { userId, returnTo, nonce } = stateVerification.payload;
  returnPath = sanitizeReturnTo(returnTo);

  // 2. Cookie-based CSRF nonce check if present
  const cookies = parseCookies(req.headers?.cookie);
  const cookieNonce = cookies['classsync_oauth_nonce'];
  if (cookieNonce && cookieNonce !== nonce) {
    console.warn('OAuth CSRF nonce mismatch detected');
    res.statusCode = 302;
    res.setHeader('Location', `${returnPath}?calendar_error=csrf_detected`);
    res.end();
    return;
  }

  // Clear the nonce cookie upon use
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    req.headers?.['x-forwarded-proto'] === 'https' ||
    Boolean(req.headers?.host && !req.headers.host.includes('localhost'));
  res.setHeader(
    'Set-Cookie',
    `classsync_oauth_nonce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? '; Secure' : ''}`
  );

  // 3. Handle user denial or OAuth error from Google
  if (errorParam) {
    console.warn('Google OAuth denied or returned error:', errorParam);
    const redirectTarget = errorParam === 'access_denied' ? 'denied' : 'error';
    res.statusCode = 302;
    res.setHeader('Location', `${returnPath}?calendar_error=${redirectTarget}`);
    res.end();
    return;
  }

  // 4. Verify authorization code presence
  if (!code) {
    res.statusCode = 302;
    res.setHeader('Location', `${returnPath}?calendar_error=missing_code`);
    res.end();
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    res.statusCode = 302;
    res.setHeader('Location', `${returnPath}?calendar_error=not_configured`);
    res.end();
    return;
  }

  try {
    // 5. Exchange authorization code for tokens securely on the server
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData.error_description || tokenData.error);
      res.statusCode = 302;
      res.setHeader('Location', `${returnPath}?calendar_error=token_exchange_failed`);
      res.end();
      return;
    }

    // 6. Fetch authenticated Google email solely for display metadata
    let userEmail = 'connected-account@gmail.com';
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        if (userInfo.email) {
          userEmail = userInfo.email;
        }
      }
    } catch (userInfoErr) {
      console.warn('Failed to fetch Google user info:', userInfoErr);
    }

    // 7. Store encrypted tokens and verified connection in Supabase via service_role
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // A. Store connection metadata (publicly viewable by user with RLS)
      await supabaseAdmin.from('calendar_connections').upsert(
        {
          user_id: userId,
          google_email: userEmail,
          google_calendar_id: 'primary',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // B. Store encrypted tokens in server-only table (no access for students)
      try {
        const encAccess = encryptToken(tokenData.access_token);
        let encRefresh = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;

        // If Google did not return a refresh_token (e.g. subsequent login), preserve the existing one
        if (!encRefresh) {
          const { data: existingTokenRow } = await supabaseAdmin
            .from('calendar_tokens')
            .select('encrypted_refresh_token')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingTokenRow?.encrypted_refresh_token) {
            encRefresh = existingTokenRow.encrypted_refresh_token;
          }
        }

        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

        await supabaseAdmin.from('calendar_tokens').upsert(
          {
            user_id: userId,
            encrypted_access_token: encAccess,
            encrypted_refresh_token: encRefresh,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (tokenStoreErr) {
        // Log cleanly without exposing sensitive tokens
        console.warn('Notice: calendar_tokens vault table not yet applied in database:', (tokenStoreErr as any)?.message);
      }
    }

    // 8. Redirect user back with verified success and email metadata only
    res.statusCode = 302;
    res.setHeader(
      'Location',
      `${returnPath}?calendar_connected=true&google_email=${encodeURIComponent(userEmail)}`
    );
    res.end();
  } catch (err) {
    console.error('OAuth callback execution error:', err);
    res.statusCode = 302;
    res.setHeader('Location', `${returnPath}?calendar_error=server_error`);
    res.end();
  }
}
