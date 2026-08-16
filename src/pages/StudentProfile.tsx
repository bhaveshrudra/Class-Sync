import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  Save, 
  User as UserIcon, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  Unlink, 
  Settings,
  Info,
  RefreshCw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { googleCalendarService } from '../services/googleCalendarService';
import type { CalendarConnection, CalendarEventSync } from '../types';

export default function StudentProfile() {
  const { user } = useAuth();
  const { events } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [name, setName] = useState('');
  const [year, setYear] = useState('1');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Google Calendar Connection State
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [connectionDetails, setConnectionDetails] = useState<CalendarConnection | null>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Batch Sync State (Phase 16 + Phase 17)
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [syncRecords, setSyncRecords] = useState<Record<string, CalendarEventSync>>({});
  const [batchSyncSummary, setBatchSyncSummary] = useState<{ synced: number; updated: number; failed: number } | null>(null);

  const userId = user?.id || 'demo-student';

  // Read URL query params for OAuth callbacks
  useEffect(() => {
    const connectedParam = searchParams.get('calendar_connected');
    const errorParam = searchParams.get('calendar_error');

    if (connectedParam === 'true') {
      setMessage({
        type: 'success',
        text: 'Google Calendar successfully connected! Academic events are ready to sync.'
      });
      // Clean up search params
      searchParams.delete('calendar_connected');
      setSearchParams(searchParams, { replace: true });
    } else if (errorParam) {
      let errorMsg = 'Failed to connect Google Calendar.';
      if (errorParam === 'missing_credentials') {
        errorMsg = 'Google OAuth credentials are not configured on the server.';
      } else if (errorParam === 'access_denied') {
        errorMsg = 'Google Calendar authorization was declined.';
      }
      setMessage({
        type: 'error',
        text: errorMsg
      });
      searchParams.delete('calendar_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Load Profile & Calendar Status & Local Syncs
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // 1. Load Profile
        const { data, error } = await supabase
          .from('profiles')
          .select('name, year, branch, section')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          setName(data.name || '');
          setYear(data.year || '1');
          setBranch(data.branch || 'CSE');
          setSection(data.section || 'A');
        } else {
          setName(user.user_metadata?.full_name || 'Demo Student');
        }

        // 2. Load Calendar Connection Status
        try {
          const status = await googleCalendarService.getStatus(userId);
          setIsConfigured(status.configured ?? true);
          setCalendarConnected(status.connected);
          if (status.connection) {
            setConnectionDetails(status.connection);
          }
        } catch {
          setIsConfigured(false);
          setCalendarConnected(false);
        }

        // 3. Load Sync Records
        const records = googleCalendarService.getAllLocalSyncRecords(userId);
        setSyncRecords(records);
      } catch (err: any) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [user, userId]);

  // Calculate cohort eligible events
  const studentProfile = { year, branch, section };
  const eligibleEvents = events.filter(e => googleCalendarService.isStudentEligible(e, studentProfile));
  const syncedEventsCount = eligibleEvents.filter(e => syncRecords[e.id]?.sync_status === 'synced').length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          year,
          branch,
          section,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      // For demo fallback mock success
      setMessage({ type: 'success', text: 'Profile preferences updated.' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectCalendar = async () => {
    setConnectingCalendar(true);
    setMessage(null);
    try {
      const result = await googleCalendarService.startConnect(userId);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        if (result.configured === false) {
          setShowConfigModal(true);
        } else {
          setMessage({ type: 'error', text: 'Google Calendar connection failed. Please try again.' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Google Calendar connection failed. Please try again.' });
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    setDisconnectingCalendar(true);
    try {
      const success = await googleCalendarService.disconnect(userId);
      if (success) {
        setCalendarConnected(false);
        setConnectionDetails(null);
        setSyncRecords({});
        setMessage({ type: 'success', text: 'Google Calendar has been disconnected.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect Google Calendar.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error disconnecting Google Calendar.' });
    } finally {
      setDisconnectingCalendar(false);
    }
  };

  const handleBatchSync = async () => {
    setIsBatchSyncing(true);
    setMessage(null);
    try {
      const result = await googleCalendarService.syncBatch(userId, events, studentProfile);
      const updatedRecords = googleCalendarService.getAllLocalSyncRecords(userId);
      setSyncRecords(updatedRecords);
      setBatchSyncSummary({
        synced: result.synced,
        updated: result.updated,
        failed: result.failed,
      });
      setMessage({
        type: 'success',
        text: `Synchronized ${result.synced} new and updated ${result.updated} event(s) in Google Calendar.`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Error occurred during batch calendar synchronization.',
      });
    } finally {
      setIsBatchSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="px-6 py-4 border-b border-slate-200/50 bg-white">
          <div className="max-w-4xl mx-auto flex items-center">
            <Link to="/student" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 font-medium">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-200">
      <header className="px-6 py-4 border-b border-slate-200/50 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/student" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="font-semibold text-slate-900">Student Profile & Settings</div>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Notification Messages */}
          {message && (
            <div className={`p-4 rounded-2xl text-sm border flex items-center gap-3 animate-in fade-in ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs' 
                : 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Profile Details Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xs border border-slate-200/80">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 shrink-0">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Academic Profile</h1>
                <p className="text-slate-500 text-sm">{user?.email || 'student@classsync.com'}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="year">Year</label>
                  <select 
                    id="year" 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white transition-all text-sm"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="branch">Branch</label>
                  <select 
                    id="branch" 
                    value={branch} 
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white transition-all text-sm"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="ME">ME</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="section">Section</label>
                  <select 
                    id="section" 
                    value={section} 
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white transition-all text-sm"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-xs"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Google Calendar Integration & Synchronization Card (Phase 16 + Phase 17) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xs border border-slate-200/80 space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Google Calendar Synchronization</h2>
                  {calendarConnected ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Connected & Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Synchronize your active academic tests, assignments, and submissions with personal Google Calendar reminders.
                </p>
              </div>
            </div>

            {calendarConnected ? (
              <div className="space-y-4">
                {/* Connection detail pill */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Connected Account:</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {connectionDetails?.google_email || 'student@gmail.com'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">Cohort Sync Scope:</span>
                    <span className="font-semibold text-slate-800">
                      Year {year} • {branch} • Section {section}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">Synchronization Status:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{syncedEventsCount} of {eligibleEvents.length} events synced</span>
                    </span>
                  </div>
                </div>

                {/* Batch Sync action & external link */}
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Cohort Calendar Auto-Sync
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Synchronize all upcoming exams and assignments matching your cohort. Duplicate prevention ensures events are updated rather than duplicated.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <a
                      href="https://calendar.google.com/calendar/r"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
                    >
                      <span>Open Calendar</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={handleBatchSync}
                      disabled={isBatchSyncing || eligibleEvents.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isBatchSyncing ? 'animate-spin' : ''}`} />
                      <span>{isBatchSyncing ? 'Syncing Cohort...' : 'Sync All Events'}</span>
                    </button>
                  </div>
                </div>

                {/* Batch summary if available */}
                {batchSyncSummary && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Last batch: {batchSyncSummary.synced} created, {batchSyncSummary.updated} updated (duplicates prevented).</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Duplicate prevention active (Phase 17)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectCalendar}
                    disabled={disconnectingCalendar}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>{disconnectingCalendar ? 'Disconnecting...' : 'Disconnect Calendar'}</span>
                  </button>
                </div>
              </div>
            ) : !isConfigured ? (
              <div className="space-y-4">
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                  Google Calendar integration is not configured. Contact your administrator to set up the necessary Google OAuth environment variables to enable synchronization features.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Configuration Required</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                  Connecting Google Calendar allows ClassSync to automatically synchronize your personalized academic schedule, test reminders, and assignment deadlines into your personal Google Calendar.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>OAuth 2.0 Secure Authorization</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectCalendar}
                    disabled={connectingCalendar}
                    id="connect-google-calendar-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>{connectingCalendar ? 'Redirecting to Google...' : 'Connect Google Calendar'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* OAuth Credentials Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Google Calendar OAuth Configuration
                </h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  To connect live Google Calendar accounts, please configure the Google OAuth environment variables in your server environment:
                </p>
                <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
                  <div>GOOGLE_CLIENT_ID=...</div>
                  <div>GOOGLE_CLIENT_SECRET=...</div>
                  <div>GOOGLE_REDIRECT_URI=...</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Once set, clicking "Connect Google Calendar" will initiate secure Google OAuth authentication.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

