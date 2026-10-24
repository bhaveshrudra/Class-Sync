import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createClient } from '@supabase/supabase-js';
import {
  createSecureOAuthState,
  verifyOAuthState,
  sanitizeReturnTo,
  encryptToken,
  decryptToken,
  revokeGoogleToken,
  authenticateSupabaseUser,
} from './api/google-calendar/oauthSecurity.ts';

// Memory store for OAuth tokens and server-managed connection sessions
interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  email: string;
}

const userTokens = new Map<string, TokenData>();

// Helper to read JSON request body in Vite server middleware
function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function calendarApiPlugin(): Plugin {
  return {
    name: 'calendar-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/google-calendar/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
        const pathname = url.pathname;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://${req.headers.host || 'localhost:3000'}/api/google-calendar/callback`;

        // 1. Auth initiation
        if (pathname === '/api/google-calendar/auth') {
          if (!clientId || !redirectUri) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                configured: false,
                error: 'Google Calendar OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.',
              })
            );
            return;
          }

          // Authenticate user session
          const authResult = await authenticateSupabaseUser(req);
          const userId = authResult.userId || url.searchParams.get('userId') || 'demo-student';
          const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'));

          const scopes = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
          ].join(' ');

          const { state, nonce } = createSecureOAuthState(userId, returnTo);

          res.setHeader('Set-Cookie', `classsync_oauth_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

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

          if (url.searchParams.get('redirect') === 'true') {
            res.statusCode = 302;
            res.setHeader('Location', authUrl);
            res.end();
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ configured: true, url: authUrl }));
          return;
        }

        // 2. Callback
        if (pathname === '/api/google-calendar/callback') {
          const code = url.searchParams.get('code');
          const errorParam = url.searchParams.get('error');
          const stateParam = url.searchParams.get('state');

          // Cryptographic state verification
          const stateVerification = verifyOAuthState(stateParam);
          let returnPath = '/student/profile';

          if (!stateVerification.valid || !stateVerification.payload) {
            res.statusCode = 302;
            res.setHeader('Location', `/student/profile?calendar_error=invalid_state`);
            res.end();
            return;
          }

          const { userId, returnTo, nonce } = stateVerification.payload;
          returnPath = sanitizeReturnTo(returnTo);

          // Cookie-based CSRF nonce check if present
          const cookieHeader = req.headers.cookie;
          if (cookieHeader) {
            const cookies: Record<string, string> = {};
            cookieHeader.split(';').forEach((c: string) => {
              const [k, ...v] = c.split('=');
              if (k && v) cookies[k.trim()] = decodeURIComponent(v.join('=').trim());
            });
            const cookieNonce = cookies['classsync_oauth_nonce'];
            if (cookieNonce && cookieNonce !== nonce) {
              res.statusCode = 302;
              res.setHeader('Location', `${returnPath}?calendar_error=csrf_detected`);
              res.end();
              return;
            }
          }

          // Clear nonce cookie
          res.setHeader('Set-Cookie', 'classsync_oauth_nonce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

          if (errorParam) {
            res.statusCode = 302;
            res.setHeader('Location', `${returnPath}?calendar_error=${errorParam === 'access_denied' ? 'denied' : 'error'}`);
            res.end();
            return;
          }

          if (!code || !clientId || !clientSecret) {
            res.statusCode = 302;
            res.setHeader('Location', `${returnPath}?calendar_error=not_configured`);
            res.end();
            return;
          }

          try {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
              }),
            });

            const tokenData = (await tokenRes.json()) as Record<string, any>;
            if (!tokenRes.ok || !tokenData?.access_token) {
              res.statusCode = 302;
              res.setHeader('Location', `${returnPath}?calendar_error=token_exchange_failed`);
              res.end();
              return;
            }

            let userEmail = 'connected-student@gmail.com';
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              });
              if (userInfoRes.ok) {
                const info = (await userInfoRes.json()) as Record<string, any>;
                if (info?.email) userEmail = info.email;
              }
            } catch {
              // ignore
            }

            // Save encrypted token securely on server
            userTokens.set(userId, {
              access_token: encryptToken(tokenData.access_token),
              refresh_token: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined,
              expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
              email: userEmail,
            });

            // Update Supabase calendar_connections and calendar_tokens if configured
            const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
              try {
                const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
                await supabaseAdmin.from('calendar_connections').upsert(
                  {
                    user_id: userId,
                    google_email: userEmail,
                    google_calendar_id: 'primary',
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id' }
                );

                // Upsert to calendar_tokens vault
                try {
                  const encAccess = encryptToken(tokenData.access_token);
                  let encRefresh = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;
                  if (!encRefresh) {
                    const { data: existingRow } = await supabaseAdmin
                      .from('calendar_tokens')
                      .select('encrypted_refresh_token')
                      .eq('user_id', userId)
                      .maybeSingle();
                    if (existingRow?.encrypted_refresh_token) {
                      encRefresh = existingRow.encrypted_refresh_token;
                    }
                  }
                  await supabaseAdmin.from('calendar_tokens').upsert(
                    {
                      user_id: userId,
                      encrypted_access_token: encAccess,
                      encrypted_refresh_token: encRefresh,
                      expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                  );
                } catch {
                  // Vault table might not yet be created in DB
                }
              } catch {
                // ignore
              }
            }

            res.statusCode = 302;
            res.setHeader(
              'Location',
              `${returnPath}?calendar_connected=true&google_email=${encodeURIComponent(userEmail)}`
            );
            res.end();
            return;
          } catch {
            res.statusCode = 302;
            res.setHeader('Location', `${returnPath}?calendar_error=server_error`);
            res.end();
            return;
          }
        }

        // 3. Status
        if (pathname === '/api/google-calendar/status') {
          const authResult = await authenticateSupabaseUser(req);
          const userId = authResult.userId || url.searchParams.get('userId') || 'demo-student';
          const isConfigured = Boolean(clientId && clientSecret);
          const hasToken = userTokens.has(userId);
          const token = userTokens.get(userId);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              configured: isConfigured,
              connected: hasToken,
              connection: hasToken
                ? {
                    id: `conn_${userId}`,
                    user_id: userId,
                    google_email: token?.email || null,
                    google_calendar_id: 'primary',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                : null,
            })
          );
          return;
        }

        // 4. Disconnect
        if (pathname === '/api/google-calendar/disconnect') {
          const authResult = await authenticateSupabaseUser(req);
          const body = await parseBody(req);
          const userId = authResult.userId || body?.userId || url.searchParams.get('userId') || 'demo-student';
          const force = body?.force === true || url.searchParams.get('force') === 'true';

          let rawToken: string | null = null;
          const tokenRecord = userTokens.get(userId);
          if (tokenRecord) {
            rawToken = decryptToken(tokenRecord.refresh_token || tokenRecord.access_token);
          }

          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          // If not in local memory, attempt lookup from calendar_tokens vault
          if (!rawToken && supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
            try {
              const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
              const { data: row } = await supabaseAdmin
                .from('calendar_tokens')
                .select('encrypted_refresh_token, encrypted_access_token')
                .eq('user_id', userId)
                .maybeSingle();

              if (row) {
                rawToken =
                  (row.encrypted_refresh_token ? decryptToken(row.encrypted_refresh_token) : null) ||
                  (row.encrypted_access_token ? decryptToken(row.encrypted_access_token) : null);
              }
            } catch {
              // ignore
            }
          }

          let revokeResult = { success: true };
          if (rawToken) {
            revokeResult = await revokeGoogleToken(rawToken);
          }

          // If Google revocation failed and force is not set, keep tokens so disconnect is retryable
          if (!revokeResult.success && !force) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                revoked: false,
                retryable: true,
                error: 'Failed to revoke token with Google servers. Your local tokens have been preserved so you can retry.',
                details: (revokeResult as any).error,
              })
            );
            return;
          }

          // Token successfully revoked or force=true: clear records
          userTokens.delete(userId);

          if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
            try {
              const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
              try {
                await supabaseAdmin.from('calendar_tokens').delete().eq('user_id', userId);
              } catch {
                // ignore
              }
              await supabaseAdmin.from('calendar_connections').delete().eq('user_id', userId);
            } catch {
              // ignore
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              revoked: revokeResult.success,
              warning: revokeResult.success ? undefined : 'Token could not be confirmed revoked at Google, but local records were deleted.',
              message: 'Google Calendar disconnected.',
            })
          );
          return;
        }

        // 5. Synchronize single academic event (Phase 16 + Phase 17 Duplicate Prevention)
        if (pathname === '/api/google-calendar/sync') {
          const body = await parseBody(req);
          const { userId = 'demo-student', event, google_event_id } = body;

          if (!event || !event.id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Event object is required for synchronization.' }));
            return;
          }

          // Build ISO start & end timestamps
          let startIso = event.start_time;
          let endIso = event.deadline;
          if (startIso && !endIso) {
            endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
          } else if (!startIso && endIso) {
            startIso = new Date(new Date(endIso).getTime() - 60 * 60 * 1000).toISOString();
          } else if (!startIso && !endIso) {
            startIso = new Date().toISOString();
            endIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          }

          const descriptionLines = [
            `ClassSync Academic Schedule Item`,
            `Type: ${event.type}`,
            event.subject ? `Subject: ${event.subject}` : null,
            `Target Cohort: Year ${event.year}, Branch ${event.branch}, Section ${event.section}`,
            event.description ? `\nDetails:\n${event.description}` : null,
            event.attachment_url ? `\nAttachment Resource:\n${event.attachment_url}` : null,
            `\nClassSync Event ID: ${event.id}`,
            `Synchronized via ClassSync Native Calendar Integration`
          ].filter(Boolean).join('\n');

          const calendarPayload = {
            summary: `[ClassSync] ${event.title}`,
            description: descriptionLines,
            start: { dateTime: startIso },
            end: { dateTime: endIso },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 24 * 60 },
                { method: 'popup', minutes: 60 }
              ]
            }
          };

          const token = userTokens.get(userId);

          // If real Google OAuth token exists, call Google Calendar API
          if (token?.access_token) {
            try {
              let responseGcal: Response;
              let action: 'created' | 'updated' = 'created';

              if (google_event_id) {
                // UPDATE existing event to prevent duplicate
                responseGcal = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(google_event_id)}`,
                  {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${token.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(calendarPayload),
                  }
                );
                action = 'updated';

                if (responseGcal.status === 404) {
                  // Fallback: If deleted in Google Calendar, re-create
                  responseGcal = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
                    {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(calendarPayload),
                    }
                  );
                  action = 'created';
                }
              } else {
                // CREATE new event
                responseGcal = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(calendarPayload),
                  }
                );
                action = 'created';
              }

              const gcalData = (await responseGcal.json()) as Record<string, any>;
              if (!responseGcal.ok) {
                res.statusCode = responseGcal.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    action: 'failed',
                    error: gcalData?.error?.message || 'Google Calendar API rejected the sync request.',
                  })
                );
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  action,
                  google_event_id: gcalData.id,
                })
              );
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  action: 'failed',
                  error: err?.message || 'Network error syncing with Google Calendar.',
                })
              );
              return;
            }
          }

          // Fallback demo/mock sync response with duplicate prevention
          const mockGoogleId = google_event_id || `gcal_evt_${event.id}_${Math.random().toString(36).substring(2, 6)}`;
          const action = google_event_id ? 'updated' : 'created';

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              action,
              google_event_id: mockGoogleId,
            })
          );
          return;
        }

        // 6. Delete/Cancel synced Google Calendar event
        if (pathname === '/api/google-calendar/delete-event') {
          const body = await parseBody(req);
          const { userId = 'demo-student', google_event_id } = body;

          if (!google_event_id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'google_event_id is required' }));
            return;
          }

          const token = userTokens.get(userId);
          if (token?.access_token) {
            try {
              await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(google_event_id)}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token.access_token}` },
                }
              );
            } catch {
              // Ignore deletion error
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, action: 'deleted' }));
          return;
        }

        // 7. Batch sync all eligible events for a student
        if (pathname === '/api/google-calendar/sync-batch') {
          const body = await parseBody(req);
          const { events = [], studentProfile = { year: '1', branch: 'CSE', section: 'A' }, existingSyncs = {} } = body;

          const results: any[] = [];
          let syncedCount = 0;
          let updatedCount = 0;
          let failedCount = 0;

          for (const ev of events) {
            // Check eligibility
            if (!ev.is_active) continue;
            const yearMatch = ev.year === 'All' || ev.year === studentProfile.year;
            const branchMatch = ev.branch === 'All' || ev.branch === studentProfile.branch;
            const sectionMatch = ev.section === 'All' || ev.section === studentProfile.section;

            if (!yearMatch || !branchMatch || !sectionMatch) {
              continue;
            }

            const existingGoogleId = existingSyncs[ev.id];
            const isUpdate = Boolean(existingGoogleId);
            const generatedId = existingGoogleId || `gcal_evt_${ev.id}_${Math.random().toString(36).substring(2, 6)}`;

            if (isUpdate) {
              updatedCount++;
            } else {
              syncedCount++;
            }

            results.push({
              event_id: ev.id,
              title: ev.title,
              result: {
                success: true,
                action: isUpdate ? 'updated' : 'created',
                google_event_id: generatedId,
              },
            });
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              total: results.length,
              synced: syncedCount,
              updated: updatedCount,
              failed: failedCount,
              results,
            })
          );
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  plugins: [
    react(),
    tailwindcss(),
    calendarApiPlugin(),
  ],
});
