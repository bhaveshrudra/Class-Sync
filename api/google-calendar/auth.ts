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

  // Extract userId from query or body if provided
  const userId = req.query?.userId || req.body?.userId || 'demo-student';

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const state = JSON.stringify({ userId, timestamp: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(state).toString('base64'),
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // If request is from browser navigation or wants redirect
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
