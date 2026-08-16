import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  AlertCircle, 
  User, 
  LogOut, 
  LayoutDashboard,
  Download,
  FileCheck,
  Users,
  ExternalLink,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Unlink,
  Settings,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { AcademicEvent, CalendarConnection, CalendarEventSync } from '../types';
import { 
  getEventStatusLabel, 
  formatDate, 
  formatTime,
  getEventBadgeColor,
  getStatusBadgeColor
} from '../utils/eventUtils';
import { getFilenameFromUrl } from '../utils/storageUtils';
import { googleCalendarService } from '../services/googleCalendarService';

export default function StudentEventDetails() {
  const { id } = useParams<{ id: string }>();
  const { logout, user } = useAuth();
  const { getEventById, loading } = useEvents();
  const navigate = useNavigate();

  // Student Profile State
  const [studentProfile, setStudentProfile] = useState<{ year: string; branch: string; section: string }>({
    year: '1',
    branch: 'CSE',
    section: 'A',
  });

  // Google Calendar Connection State
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [connectionDetails, setConnectionDetails] = useState<CalendarConnection | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Sync State (Phase 16 + Phase 17)
  const [syncRecord, setSyncRecord] = useState<CalendarEventSync | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const userId = user?.id || 'demo-student';

  useEffect(() => {
    async function loadData() {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('year, branch, section')
            .eq('id', user.id)
            .single();
          if (data) {
            setStudentProfile({
              year: data.year || '1',
              branch: data.branch || 'CSE',
              section: data.section || 'A',
            });
          }
        } catch {
          // ignore
        }
      }

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

      if (id) {
        const record = await googleCalendarService.getEventSyncRecord(userId, id);
        setSyncRecord(record);
      }
    }
    loadData();
  }, [user, id, userId]);

  const handleConnectCalendar = async () => {
    setIsConnecting(true);
    setSyncFeedback(null);
    try {
      const result = await googleCalendarService.startConnect(userId);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        if (result.configured === false) {
          setShowConfigModal(true);
        } else {
          setSyncFeedback({ type: 'error', message: 'Google Calendar connection failed. Please try again.' });
        }
      }
    } catch {
      setSyncFeedback({ type: 'error', message: 'Google Calendar connection failed. Please try again.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    await googleCalendarService.disconnect(userId);
    setCalendarConnected(false);
    setConnectionDetails(null);
    setSyncFeedback({ type: 'success', message: 'Google Calendar disconnected.' });
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Look up the event in the shared events state
  const event: AcademicEvent | undefined = id ? getEventById(id) : undefined;
  const now = new Date();

  // Cohort eligibility check
  const isEligible = event ? googleCalendarService.isStudentEligible(event, studentProfile) : false;

  const handleSyncEvent = async () => {
    if (!event) return;
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const result = await googleCalendarService.syncEvent(userId, event, studentProfile);
      if (result.success) {
        const record = await googleCalendarService.getEventSyncRecord(userId, event.id);
        setSyncRecord(record);
        setSyncFeedback({
          type: 'success',
          message: result.action === 'updated' 
            ? 'Google Calendar event updated (duplicate prevented).' 
            : 'Event synchronized with Google Calendar.',
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: result.error || 'Failed to sync with Google Calendar.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Error occurred while syncing with Google Calendar.',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4500);
    }
  };

  // Helper for icon based on type
  const getEventIcon = (type: AcademicEvent['type']) => {
    switch (type) {
      case 'Assignment':
      case 'Submission':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'Class Test':
      case 'Internal Exam':
        return <BookOpen className="w-5 h-5 text-purple-600" />;
      case 'Semester Exam':
      case 'Lab Exam':
        return <GraduationCap className="w-5 h-5 text-rose-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
    }
  };

  // Helper for file type icon
  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-600" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (['ppt', 'pptx'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-orange-600" />;
    return <FileCode className="w-5 h-5 text-indigo-600" />;
  };

  const attachmentFileName = event?.attachment_url ? getFilenameFromUrl(event.attachment_url) : 'Resource Document';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">ClassSync</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/student/profile')} 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            title="Profile"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900">ClassSync</span>
        </div>
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <Link 
            to="/student" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/student/upcoming" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <CalendarIcon className="w-5 h-5" />
            Upcoming
          </Link>
          <Link 
            to="/student/calendar" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <CalendarDays className="w-5 h-5" />
            Calendar
          </Link>
          <Link 
            to="/student/profile" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <User className="w-5 h-5" />
            Profile
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 md:pb-12">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/student/upcoming"
            id="back-to-upcoming-btn"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 px-3.5 py-2 rounded-xl border border-slate-200 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Upcoming
          </Link>

          <Link
            to="/student/calendar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            <span>View in Calendar</span>
          </Link>
        </div>

        {/* Missing Event State */}
        {loading ? (
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-slate-200/80 border-dashed text-center shadow-xs">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Loading event...</h1>
            <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto">
              Fetching the latest event details.
            </p>
          </div>
        ) : !event ? (
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-slate-200/80 border-dashed text-center shadow-xs">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found.</h1>
            <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto mb-6">
              The requested academic event could not be found or may have been removed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/student/upcoming"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-xs text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Upcoming
              </Link>
              <Link
                to="/student/calendar"
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                <CalendarDays className="w-4 h-4" />
                Back to Calendar
              </Link>
            </div>
          </div>
        ) : (
          /* Event Details Card */
          <div className="space-y-6">
            <article className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
              {/* Event Header & Badges */}
              <div className="space-y-3 pb-6 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${getEventBadgeColor(event.type)}`}>
                      {getEventIcon(event.type)}
                      {event.type}
                    </span>
                    {event.subject && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                        {event.subject}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold ${getStatusBadgeColor(getEventStatusLabel(event, now))}`}>
                    {getEventStatusLabel(event, now)}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {event.title}
                </h1>
              </div>

              {/* Event Schedule & Timing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span>Scheduled Date & Time</span>
                  </div>
                  <div className="text-slate-900 font-semibold text-base">
                    {event.start_time ? formatDate(event.start_time) : 'Date unassigned'}
                  </div>
                  {event.start_time && (
                    <div className="text-slate-500 text-xs flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(event.start_time)}</span>
                    </div>
                  )}
                </div>

                {event.deadline ? (
                  <div className="bg-orange-50/70 rounded-2xl p-4 border border-orange-200/60 space-y-1">
                    <div className="flex items-center gap-2 text-orange-600 text-xs font-bold uppercase tracking-wider">
                      <Clock className="w-4 h-4" />
                      <span>Submission Deadline</span>
                    </div>
                    <div className="text-orange-950 font-bold text-base">
                      {formatDate(event.deadline)}
                    </div>
                    <div className="text-orange-700 text-xs font-medium">
                      Due at: {formatTime(event.deadline)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Format</span>
                    </div>
                    <div className="text-slate-900 font-semibold text-base">
                      In-Person / Class Scheduled
                    </div>
                    <div className="text-slate-500 text-xs">
                      Attend according to schedule
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Description & Details
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {event.description || 'No additional description provided for this academic event.'}
                </div>
              </div>

              {/* Target Audience / Academic Scope */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  Target Class & Section
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Year</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                      {event.year === 'All' ? 'All Years' : `Year ${event.year}`}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Branch</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                      {event.branch === 'All' ? 'All Branches' : event.branch}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Section</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                      {event.section === 'All' ? 'All Sections' : `Sec ${event.section}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachment Section (Phase 14 Supabase Storage) */}
              <div className="space-y-2 pt-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-600" />
                  Academic Resource Attachment
                </h2>
                {event.attachment_url ? (
                  <div className="bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
                        {getFileIcon(event.attachment_url)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {attachmentFileName}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Official course resource attached by course faculty
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <a
                        href={event.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={event.attachment_url}
                        download={attachmentFileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-2xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200/60 border-dashed bg-slate-50/60 text-slate-400 text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-300" />
                    <span>No attachments provided.</span>
                  </div>
                )}
              </div>

              {/* Google Calendar Synchronization & Duplicate Prevention (Phase 16 + Phase 17) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    Google Calendar Synchronization
                  </h2>
                  {syncRecord?.sync_status === 'synced' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Synced
                    </span>
                  )}
                </div>

                {/* Feedback Alert */}
                {syncFeedback && (
                  <div className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in ${
                    syncFeedback.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {syncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{syncFeedback.message}</span>
                  </div>
                )}

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                  {/* Account status header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {calendarConnected ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-slate-900">Connected: {connectionDetails?.google_email || 'student@gmail.com'}</span>
                          </>
                        ) : !isConfigured ? (
                          <>
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Google Calendar integration is not configured.</span>
                          </>
                        ) : (
                          <>
                            <CalendarDays className="w-4 h-4 text-slate-600" />
                            <span>Connect Google Account</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {calendarConnected
                          ? 'Synchronize this academic event directly to your personal Google Calendar.'
                          : !isConfigured 
                            ? 'Contact your administrator to configure Google OAuth integration.'
                            : 'Connect your Google account to automatically sync your schedule and receive native notifications.'}
                      </p>
                    </div>

                    {calendarConnected ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleDisconnectCalendar}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 bg-white border border-slate-200 rounded-xl transition-colors"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          Disconnect
                        </button>
                      </div>
                    ) : isConfigured ? (
                      <button
                        type="button"
                        onClick={handleConnectCalendar}
                        disabled={isConnecting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs shrink-0"
                      >
                        <CalendarDays className="w-4 h-4" />
                        <span>{isConnecting ? 'Connecting...' : 'Connect Google Calendar'}</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Sync Control & State */}
                  {calendarConnected && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-3">
                      {/* Cohort Eligibility Notice */}
                      {!isEligible ? (
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">Cohort Filter Notice</div>
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              This event is designated for Year {event.year}, Branch {event.branch}, Section {event.section} 
                              (Your profile: Year {studentProfile.year}, Branch {studentProfile.branch}, Section {studentProfile.section}).
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="space-y-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {syncRecord?.sync_status === 'synced' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Event Synced to Google Calendar</span>
                                </>
                              ) : syncRecord?.sync_status === 'failed' ? (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                  <span className="text-red-700">Google Calendar sync failed.</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Ready for Google Calendar Sync</span>
                                </>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {syncRecord?.last_synced_at ? (
                                <span>Last synchronized: {formatDate(syncRecord.last_synced_at)} at {formatTime(syncRecord.last_synced_at)}</span>
                              ) : (
                                <span>Native 24h & 1h Google reminders will be configured automatically.</span>
                              )}
                            </div>
                            {syncRecord?.google_event_id && (
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                GCal ID: {syncRecord.google_event_id} (Duplicate Prevention Active)
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {syncRecord?.sync_status === 'synced' && (
                              <a
                                href="https://calendar.google.com/calendar/r"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors"
                              >
                                <span>Open Calendar</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={handleSyncEvent}
                              disabled={isSyncing}
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors shadow-2xs ${
                                syncRecord?.sync_status === 'synced'
                                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                              <span>
                                {isSyncing 
                                  ? 'Syncing...' 
                                  : syncRecord?.sync_status === 'synced' 
                                    ? 'Resync Event' 
                                    : syncRecord?.sync_status === 'failed'
                                      ? 'Retry Sync'
                                      : 'Sync to Google Calendar'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Google Calendar reminders & notifications handle all alerts natively. Duplicate prevention prevents duplicate schedule entries.</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        )}

        {/* Configuration Guidance Modal (When OAuth credentials are unset in env) */}
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link 
          to="/student" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link 
          to="/student/upcoming" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <CalendarIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">Upcoming</span>
        </Link>
        <Link 
          to="/student/calendar" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <CalendarDays className="w-6 h-6" />
          <span className="text-[10px] font-medium">Calendar</span>
        </Link>
        <Link 
          to="/student/profile" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}

