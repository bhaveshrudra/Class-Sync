import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers?.host || 'localhost:3000'}`);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const stateParam = url.searchParams.get('state');

  // Handle user denial or OAuth error
  if (errorParam) {
    console.warn('Google OAuth denied or failed:', errorParam);
    const redirectTarget = errorParam === 'access_denied' ? 'denied' : 'error';
    res.statusCode = 302;
    res.setHeader('Location', `/student/profile?calendar_error=${redirectTarget}`);
    res.end();
    return;
  }

  if (!code) {
    res.statusCode = 302;
    res.setHeader('Location', '/student/profile?calendar_error=missing_code');
    res.end();
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    res.statusCode = 302;
    res.setHeader('Location', '/student/profile?calendar_error=not_configured');
    res.end();
    return;
  }

  let parsedUserId = 'demo-student';
  if (stateParam) {
    try {
      const decoded = Buffer.from(stateParam, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.userId) parsedUserId = parsed.userId;
    } catch (e) {
      console.warn('Could not decode OAuth state:', e);
    }
  }

  try {
    // 1. Exchange authorization code for tokens securely on the server
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
      res.setHeader('Location', '/student/profile?calendar_error=token_exchange_failed');
      res.end();
      return;
    }

    // 2. Fetch authenticated user's Google email
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

    // 3. Persist connection to Supabase if configured, or use session state
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin.from('calendar_connections').upsert(
        {
          user_id: parsedUserId,
          google_email: userEmail,
          google_calendar_id: 'primary',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    // Redirect user back to student profile with success and email parameter (never expose secrets or tokens)
    res.statusCode = 302;
    res.setHeader(
      'Location',
      `/student/profile?calendar_connected=true&google_email=${encodeURIComponent(userEmail)}`
    );
    res.end();
  } catch (err) {
    console.error('OAuth callback execution error:', err);
    res.statusCode = 302;
    res.setHeader('Location', '/student/profile?calendar_error=server_error');
    res.end();
  }
}
