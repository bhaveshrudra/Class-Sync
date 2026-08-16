import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body: any = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const userId = body.userId || 'demo-student';

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('calendar_connections').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('Error deleting calendar connection:', err);
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: true, message: 'Google Calendar disconnected.' }));
}
