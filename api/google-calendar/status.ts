import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const isConfigured = Boolean(clientId && clientSecret);

  const url = new URL(req.url, `http://${req.headers?.host || 'localhost:3000'}`);
  const userId = url.searchParams.get('userId') || 'demo-student';

  res.setHeader('Content-Type', 'application/json');

  if (!isConfigured) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        configured: false,
        connected: false,
        connection: null,
      })
    );
    return;
  }

  // Attempt reading from Supabase if available
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            configured: true,
            connected: true,
            connection: data,
          })
        );
        return;
      }
    } catch (err) {
      console.warn('Error reading calendar connection status:', err);
    }
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      configured: true,
      connected: false,
      connection: null,
    })
  );
}
