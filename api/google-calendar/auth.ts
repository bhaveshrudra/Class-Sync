import {
  sanitizeReturnTo,
  createSecureOAuthState,
  authenticateSupabaseUser,
} from './oauthSecurity';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        configured: false,
        error: 'Google Calendar OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI environment variables.',
      })
    );
    return;
  }

  // 1. Authenticate user to cryptographically bind the OAuth flow to the active Supabase session
  const authResult = await authenticateSupabaseUser(req);
  let userId = authResult.userId;

  if (!userId) {
    // In local development or demo mode, support fallback userId if explicitly requested
    const queryUserId = req.query?.userId || req.body?.userId;
    if (queryUserId && (process.env.NODE_ENV !== 'production' || queryUserId === 'demo-student')) {
      userId = queryUserId;
    } else {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Unauthorized. An authenticated student session is required to initiate Google Calendar connection.',
        })
      );
      return;
    }
  }

  // 2. Validate returnTo against explicit internal allowlist
  const requestedReturnTo = req.query?.returnTo || req.body?.returnTo;
  const returnTo = sanitizeReturnTo(requestedReturnTo);

  // 3. Minimum necessary scopes (calendar.events + userinfo.email)
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  // 4. Generate cryptographically signed, tamper-proof state parameter with TTL & nonce
  const { state, nonce } = createSecureOAuthState(userId, returnTo);

  // Set CSRF protection cookie matching the signed nonce
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    redirectUri.startsWith('https://') ||
    req.headers?.['x-forwarded-proto'] === 'https' ||
    Boolean(req.headers?.host && !req.headers.host.includes('localhost'));
  res.setHeader(
    'Set-Cookie',
    `classsync_oauth_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isSecure ? '; Secure' : ''}`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // If request wanted direct browser 302 navigation
  if (req.query?.redirect === 'true') {
    res.statusCode = 302;
    res.setHeader('Location', authUrl);
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      configured: true,
      url: authUrl,
    })
  );
}
