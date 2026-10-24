import type { 
  CalendarConnection, 
  GoogleCalendarStatusResponse, 
  AcademicEvent, 
  CalendarEventSync, 
  GoogleCalendarSyncResult,
  BatchSyncResult 
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CONNECTION_STORAGE_KEY = 'classsync_calendar_connection';
const SYNC_RECORDS_STORAGE_KEY = 'classsync_calendar_event_syncs';

async function getAuthHeader(): Promise<Record<string, string>> {
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    } catch {
      // ignore
    }
  }
  return {};
}

export const googleCalendarService = {
  /**
   * Checks if an academic event applies to a student's cohort & is active
   */
  isStudentEligible(
    event: AcademicEvent,
    studentProfile?: { year?: string | null; branch?: string | null; section?: string | null } | null
  ): boolean {
    if (!event.is_active) return false;

    const eventYearAll = !event.year || event.year.toUpperCase() === 'ALL';
    const eventBranchAll = !event.branch || event.branch.toUpperCase() === 'ALL';
    const eventSectionAll = !event.section || event.section.toUpperCase() === 'ALL';

    // Students with missing or incomplete profiles must NOT receive cohort-specific events.
    // They may only see strictly global announcements (All years, branches, and sections).
    if (!studentProfile) {
      return eventYearAll && eventBranchAll && eventSectionAll;
    }

    const yearMatches =
      eventYearAll ||
      (Boolean(studentProfile.year) &&
        (event.year === studentProfile.year || event.year.toUpperCase() === studentProfile.year!.toUpperCase()));

    const branchMatches =
      eventBranchAll ||
      (Boolean(studentProfile.branch) &&
        (event.branch === studentProfile.branch || event.branch.toUpperCase() === studentProfile.branch!.toUpperCase()));

    const sectionMatches =
      eventSectionAll ||
      (Boolean(studentProfile.section) &&
        (event.section === studentProfile.section || event.section.toUpperCase() === studentProfile.section!.toUpperCase()));

    return yearMatches && branchMatches && sectionMatches;
  },

  /**
   * Retrieves connection state from Supabase database or backend status endpoint
   */
  async getStatus(userId: string = 'demo-student'): Promise<GoogleCalendarStatusResponse> {
    // 1. Check Supabase calendar_connections table if authenticated
    if (isSupabaseConfigured && userId && userId !== 'demo-student') {
      try {
        const { data: dbConn, error: dbErr } = await supabase
          .from('calendar_connections')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!dbErr && dbConn) {
          let serverConfigured = true;
          try {
            const apiRes = await fetch(`/api/google-calendar/status?userId=${encodeURIComponent(userId)}`);
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData.configured !== undefined) serverConfigured = apiData.configured;
            }
          } catch {
            // Keep serverConfigured as true if database row exists
          }

          return {
            configured: serverConfigured,
            connected: true,
            connection: dbConn as CalendarConnection,
          };
        }
      } catch (dbErr) {
        console.warn('Could not query calendar_connections from Supabase:', dbErr);
      }
    }

    // 2. Query backend API status endpoint with auth header
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/google-calendar/status?userId=${encodeURIComponent(userId)}`, {
        headers,
      });
      if (response.ok) {
        const data: GoogleCalendarStatusResponse = await response.json();
        return data;
      }
    } catch (err) {
      console.warn('Could not query calendar status endpoint:', err);
    }

    return {
      configured: false,
      connected: false,
      connection: null,
    };
  },

  /**
   * Initiates Google OAuth connection flow
   */
  async startConnect(
    userId: string = 'demo-student',
    returnTo: string = '/student/profile'
  ): Promise<{ success: boolean; url?: string; error?: string; configured?: boolean }> {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `/api/google-calendar/auth?userId=${encodeURIComponent(userId)}&returnTo=${encodeURIComponent(returnTo)}`,
        { headers }
      );
      const data = await res.json();

      if (!res.ok || !data.configured || !data.url) {
        return {
          success: false,
          configured: false,
          error: data.error || 'Google Calendar OAuth is not configured on this server.',
        };
      }

      return {
        success: true,
        configured: true,
        url: data.url,
      };
    } catch (err: unknown) {
      return {
        success: false,
        configured: false,
        error: err instanceof Error ? err.message : 'Network error initiating Google connection.',
      };
    }
  },

  /**
   * Save successful connection locally without storing access or refresh tokens
   */
  saveLocalConnection(userId: string, email: string, calendarId: string = 'primary'): CalendarConnection {
    const connection: CalendarConnection = {
      id: `conn_${Date.now()}`,
      user_id: userId,
      google_email: email,
      google_calendar_id: calendarId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return connection;
  },

  /**
   * Disconnects Google Calendar and cleans up database and server state.
   * Ensures token revocation failures do not produce a misleading success response
   * and preserves state for retry when revocation fails.
   */
  async disconnect(userId: string = 'demo-student', force: boolean = false): Promise<boolean> {
    // 1. Notify backend server to revoke tokens and remove server records first
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ userId, force }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        console.warn('Google Calendar disconnect failed on server:', data.error || data.details);
        // Do NOT wipe local or database connection state on revocation failure so user can retry
        return false;
      }
    } catch (netErr) {
      console.warn('Network error during calendar disconnect:', netErr);
      return false;
    }

    // 2. Cleanup Supabase client-side connection if server succeeded
    if (isSupabaseConfigured && userId && userId !== 'demo-student') {
      try {
        await supabase
          .from('calendar_connections')
          .delete()
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Error deleting calendar connection from Supabase:', err);
      }
    }

    localStorage.removeItem(CONNECTION_STORAGE_KEY);
    return true;
  },

  /**
   * Gets all local sync records for a user
   */
  getAllLocalSyncRecords(userId: string): Record<string, CalendarEventSync> {
    try {
      const stored = localStorage.getItem(`${SYNC_RECORDS_STORAGE_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return {};
  },

  /**
   * Saves local sync records
   */
  saveLocalSyncRecords(userId: string, records: Record<string, CalendarEventSync>): void {
    try {
      localStorage.setItem(`${SYNC_RECORDS_STORAGE_KEY}_${userId}`, JSON.stringify(records));
    } catch {
      // ignore
    }
  },

  /**
   * Gets the sync record for a specific event (checks DB + local fallback)
   */
  async getEventSyncRecord(userId: string, academicEventId: string): Promise<CalendarEventSync | null> {
    // 1. Try checking local store first (instant response)
    const localRecords = this.getAllLocalSyncRecords(userId);
    if (localRecords[academicEventId]) {
      return localRecords[academicEventId];
    }

    // 2. Query Supabase calendar_event_sync if available
    try {
      const { data, error } = await supabase
        .from('calendar_event_sync')
        .select('*')
        .eq('user_id', userId)
        .eq('academic_event_id', academicEventId)
        .single();

      if (!error && data) {
        const syncRecord: CalendarEventSync = {
          id: data.id,
          academic_event_id: data.academic_event_id,
          user_id: data.user_id,
          google_event_id: data.google_event_id,
          sync_status: data.sync_status,
          last_synced_at: data.last_synced_at,
          error_message: data.error_message,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        // Update local cache
        localRecords[academicEventId] = syncRecord;
        this.saveLocalSyncRecords(userId, localRecords);
        return syncRecord;
      }
    } catch {
      // ignore DB query error
    }

    return null;
  },

  /**
   * Synchronizes an event into the student's Google Calendar with Duplicate Prevention
   */
  async syncEvent(
    userId: string,
    event: AcademicEvent,
    studentProfile?: { year: string; branch: string; section: string }
  ): Promise<GoogleCalendarSyncResult> {
    // 1. Verify eligibility if student profile is provided
    if (studentProfile && !this.isStudentEligible(event, studentProfile)) {
      return {
        success: false,
        action: 'skipped',
        error: 'Event does not match your cohort (Year/Branch/Section) or is inactive.',
      };
    }

    // 2. Check for existing sync record to prevent duplicates
    const existingRecord = await this.getEventSyncRecord(userId, event.id);
    const existingGoogleId = existingRecord?.google_event_id;

    try {
      // 3. Call server-side sync API
      const res = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          event,
          google_event_id: existingGoogleId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Failed to synchronize with Google Calendar';
        
        // Save failed sync record for visibility
        if (existingRecord) {
          const failedRecord: CalendarEventSync = {
            ...existingRecord,
            sync_status: 'failed',
            error_message: errorMsg,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const localRecords = this.getAllLocalSyncRecords(userId);
          localRecords[event.id] = failedRecord;
          this.saveLocalSyncRecords(userId, localRecords);
        }

        return {
          success: false,
          action: 'failed',
          error: errorMsg,
        };
      }

      // 4. Update sync record with new/confirmed google_event_id
      const googleEventId = data.google_event_id || existingGoogleId || `gcal_evt_${event.id}`;
      const updatedSyncRecord: CalendarEventSync = {
        id: existingRecord?.id || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        academic_event_id: event.id,
        user_id: userId,
        google_event_id: googleEventId,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        error_message: null,
        created_at: existingRecord?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save locally
      const localRecords = this.getAllLocalSyncRecords(userId);
      localRecords[event.id] = updatedSyncRecord;
      this.saveLocalSyncRecords(userId, localRecords);

      // Attempt upsert to Supabase calendar_event_sync if live
      try {
        await supabase
          .from('calendar_event_sync')
          .upsert({
            academic_event_id: event.id,
            user_id: userId,
            google_event_id: googleEventId,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,academic_event_id' });
      } catch {
        // Fallback gracefully on local state
      }

      return {
        success: true,
        action: data.action || (existingGoogleId ? 'updated' : 'created'),
        google_event_id: googleEventId,
        syncRecord: updatedSyncRecord,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'failed',
        error: err?.message || 'Network error communicating with Calendar sync service.',
      };
    }
  },

  /**
   * Deletes/Cancels synced Google Calendar event
   */
  async deleteSyncedEvent(userId: string, academicEventId: string): Promise<GoogleCalendarSyncResult> {
    const existingRecord = await this.getEventSyncRecord(userId, academicEventId);
    if (!existingRecord || !existingRecord.google_event_id) {
      return { success: true, action: 'skipped' };
    }

    try {
      await fetch('/api/google-calendar/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          google_event_id: existingRecord.google_event_id,
        }),
      });

      // Remove from local store
      const localRecords = this.getAllLocalSyncRecords(userId);
      delete localRecords[academicEventId];
      this.saveLocalSyncRecords(userId, localRecords);

      // Remove from Supabase if present
      try {
        await supabase
          .from('calendar_event_sync')
          .delete()
          .eq('user_id', userId)
          .eq('academic_event_id', academicEventId);
      } catch {
        // ignore
      }

      return { success: true, action: 'deleted' };
    } catch (err: any) {
      return { success: false, action: 'failed', error: err?.message };
    }
  },

  /**
   * Batch synchronizes all eligible events for a student's cohort
   */
  async syncBatch(
    userId: string,
    events: AcademicEvent[],
    studentProfile: { year: string; branch: string; section: string }
  ): Promise<BatchSyncResult> {
    const localRecords = this.getAllLocalSyncRecords(userId);
    const existingMap: Record<string, string> = {};
    for (const [evtId, record] of Object.entries(localRecords)) {
      if (record.google_event_id) {
        existingMap[evtId] = record.google_event_id;
      }
    }

    try {
      const res = await fetch('/api/google-calendar/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          events,
          studentProfile,
          existingSyncs: existingMap,
        }),
      });

      if (res.ok) {
        const data: BatchSyncResult = await res.json();
        // Update local store for all synced items
        for (const item of data.results) {
          if (item.result.success && item.result.google_event_id) {
            localRecords[item.event_id] = {
              id: localRecords[item.event_id]?.id || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              academic_event_id: item.event_id,
              user_id: userId,
              google_event_id: item.result.google_event_id,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
              error_message: null,
              created_at: localRecords[item.event_id]?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }
        this.saveLocalSyncRecords(userId, localRecords);
        return data;
      }
    } catch {
      // Fallback manual loop
    }

    // Manual fallback execution
    let synced = 0;
    let updated = 0;
    let failed = 0;
    const results: Array<{ event_id: string; title: string; result: GoogleCalendarSyncResult }> = [];

    for (const ev of events) {
      if (!this.isStudentEligible(ev, studentProfile)) continue;
      const res = await this.syncEvent(userId, ev, studentProfile);
      if (res.success) {
        if (res.action === 'updated') updated++;
        else synced++;
      } else {
        failed++;
      }
      results.push({
        event_id: ev.id,
        title: ev.title,
        result: res,
      });
    }

    return {
      total: results.length,
      synced,
      updated,
      failed,
      results,
    };
  }
};
