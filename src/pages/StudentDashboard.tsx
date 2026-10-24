import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { 
  LogOut, 
  User, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  CalendarDays, 
  LayoutDashboard,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Settings,
  ArrowRight,
  Loader2,
  Info
} from 'lucide-react';
import type { AcademicEvent } from '../types';
import { googleCalendarService } from '../services/googleCalendarService';

export default function StudentDashboard() {
  const { logout, user, profile } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Google Calendar Integration State
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userId = user?.id || 'demo-student';

  // Handle OAuth callback parameters when returning to /student
  useEffect(() => {
    const connectedParam = searchParams.get('calendar_connected');
    const errorParam = searchParams.get('calendar_error');
    const googleEmailParam = searchParams.get('google_email');

    if (connectedParam === 'true') {
      setFeedback({
        type: 'success',
        text: 'Google Calendar successfully connected! Your account is linked.',
      });
      // Fetch verified server-side connection record from Supabase
      googleCalendarService.getStatus(user?.id || userId).then((status) => {
        setCalendarConnected(status.connected);
        setCalendarEmail(status.connection?.google_email || null);
      });
      searchParams.delete('calendar_connected');
      if (googleEmailParam) searchParams.delete('google_email');
      setSearchParams(searchParams, { replace: true });
    } else if (errorParam) {
      let errorMsg = 'Failed to connect Google Calendar.';
      if (errorParam === 'missing_credentials' || errorParam === 'not_configured') {
        errorMsg = 'Google OAuth credentials are not configured on the server.';
      } else if (errorParam === 'access_denied' || errorParam === 'denied') {
        errorMsg = 'Google Calendar authorization was declined.';
      } else if (errorParam === 'invalid_state' || errorParam === 'csrf_detected') {
        errorMsg = 'Security validation failed (invalid state or session). Please try again.';
      } else if (errorParam === 'token_exchange_failed') {
        errorMsg = 'Failed to exchange authorization token with Google. Please try again.';
      }
      setFeedback({
        type: 'error',
        text: errorMsg,
      });
      searchParams.delete('calendar_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user, userId]);

  // Load calendar connection status
  useEffect(() => {
    let mounted = true;
    async function checkCalendar() {
      try {
        const status = await googleCalendarService.getStatus(userId);
        if (mounted) {
          setCalendarConnected(status.connected);
          setCalendarEmail(status.connection?.google_email || null);
        }
      } catch {
        if (mounted) setCalendarConnected(false);
      } finally {
        if (mounted) setCalendarLoading(false);
      }
    }
    checkCalendar();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleStartConnect = async () => {
    setShowConsentModal(false);
    setConnectingCalendar(true);
    setFeedback(null);
    try {
      const result = await googleCalendarService.startConnect(userId, '/student');
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        if (result.configured === false) {
          setShowConfigModal(true);
        } else {
          setFeedback({ type: 'error', text: result.error || 'Failed to start Google connection.' });
        }
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error connecting Google Calendar. Please try again.' });
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const studentName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';

  const { upcomingEvents, assignmentsCount, testsCount, examsCount, upcomingCount } = useMemo(() => {
    const now = new Date();
    const eligibleEvents = events.filter((e) => googleCalendarService.isStudentEligible(e, profile));

    const upcoming = eligibleEvents
      .filter(e => {
        const eventDate = new Date(e.start_time || e.deadline || e.created_at);
        return eventDate > now && e.is_active;
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_time || a.deadline || a.created_at).getTime();
        const dateB = new Date(b.start_time || b.deadline || b.created_at).getTime();
        return dateA - dateB;
      });

    return {
      upcomingEvents: upcoming,
      assignmentsCount: upcoming.filter(e => e.type === 'Assignment' || e.type === 'Submission').length,
      testsCount: upcoming.filter(e => e.type === 'Class Test' || e.type === 'Internal Exam').length,
      examsCount: upcoming.filter(e => e.type === 'Semester Exam' || e.type === 'Lab Exam').length,
      upcomingCount: upcoming.length
    };
  }, [events, profile]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return new Date(dateString).toLocaleTimeString('en-US', options);
  };

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
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
  };

  const getEventColor = (type: AcademicEvent['type']) => {
    switch (type) {
      case 'Assignment':
      case 'Submission':
        return 'bg-blue-50 border-blue-100';
      case 'Class Test':
      case 'Internal Exam':
        return 'bg-purple-50 border-purple-100';
      case 'Semester Exam':
      case 'Lab Exam':
        return 'bg-rose-50 border-rose-100';
      default:
        return 'bg-orange-50 border-orange-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">ClassSync</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/student/profile')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900">ClassSync</span>
        </div>
        <div className="flex-1 py-6 px-4 flex flex-col gap-2">
          <Link to="/student" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-medium transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link to="/student/upcoming" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            <Calendar className="w-5 h-5" />
            Upcoming
          </Link>
          <Link to="/student/calendar" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            <CalendarDays className="w-5 h-5" />
            Calendar
          </Link>
          <Link to="/student/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            <User className="w-5 h-5" />
            Profile
          </Link>
        </div>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 font-medium transition-colors">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
        <header className="mb-8 hidden md:block">
          <h1 className="text-2xl font-bold text-slate-900">Hello, {studentName}</h1>
          <p className="text-slate-500 mt-1">Here is what's happening with your classes today.</p>
        </header>

        <header className="mb-6 md:hidden">
          <h1 className="text-2xl font-bold text-slate-900">Hello, {studentName}</h1>
          <p className="text-slate-500 mt-1">Here is what's happening with your classes.</p>
        </header>

        {/* Feedback alert message if returned from OAuth */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-2xl text-sm border flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs' 
              : 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Google Calendar Connection Status Banner */}
        <div className="mb-8 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base">Google Calendar Integration</h3>
                {calendarLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : calendarConnected ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
                {calendarConnected
                  ? `Connected to ${calendarEmail || 'your Google account'}. Your academic schedule can sync with personal calendar reminders.`
                  : 'Link your personal Google Calendar to view deadlines and test schedules alongside your daily routine.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            {calendarConnected ? (
              <Link
                to="/student/profile"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Manage Connection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                disabled={connectingCalendar}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-2 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                <span>{connectingCalendar ? 'Redirecting...' : 'Connect Google Calendar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Assignments</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{assignmentsCount}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Tests</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{testsCount}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">Exams</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{examsCount}</span>
          </div>
          <div className="bg-blue-600 p-4 rounded-2xl shadow-sm flex flex-col text-white">
            <div className="flex items-center gap-2 text-blue-100 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Upcoming</span>
            </div>
            <span className="text-2xl font-bold">{upcomingCount}</span>
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Upcoming Events
          </h2>

          {upcomingEvents.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No upcoming assignments.</h3>
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {upcomingEvents.map((event) => (
                <Link 
                  key={event.id} 
                  to={`/student/events/${event.id}`}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md hover:border-blue-200 transition-all block group"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {event.type}
                        </span>
                        {event.subject && (
                          <span className="text-sm font-medium text-blue-600">
                            {event.subject}
                          </span>
                        )}
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md ml-auto md:ml-0">
                          Status: Upcoming
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-1 truncate group-hover:text-blue-600 transition-colors">{event.title}</h3>
                      
                      {event.description && (
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500 mt-2">
                        {event.start_time && (
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4" />
                            <span>{formatDate(event.start_time)} · {formatTime(event.start_time)}</span>
                          </div>
                        )}
                        {event.deadline && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span className="text-orange-600 font-medium">Due: {formatDate(event.deadline)} {formatTime(event.deadline)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Consent & Permissions Explanation Modal */}
        {showConsentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Connect Google Calendar</h3>
                  <p className="text-xs text-slate-500">OAuth 2.0 Secure Authorization</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <p className="font-semibold text-slate-800">
                  ClassSync requests the following permissions from your Google Account:
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Manage calendar events</span>
                      <p className="text-slate-500 text-[11px]">Scope: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">.../auth/calendar.events</code></p>
                      <p className="text-slate-600 text-[11px] mt-0.5">Allows ClassSync to add, update, and manage your academic deadlines and exam reminders.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Verify your Google email</span>
                      <p className="text-slate-500 text-[11px]">Scope: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">.../auth/userinfo.email</code></p>
                      <p className="text-slate-600 text-[11px] mt-0.5">Identifies which Google account is linked to your student profile.</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Google's <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">calendar.events</code> scope permits viewing and editing events across calendars in your account. ClassSync uses this permission solely to add and manage your academic deadlines and exams, and will never modify your personal calendar entries. You can disconnect at any time.</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartConnect}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-2"
                >
                  <span>Continue to Google</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OAuth Configuration Guidance Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Google Calendar OAuth Configuration
                </h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  To connect live Google Calendar accounts, please configure the Google Cloud OAuth credentials in your server environment:
                </p>
                <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
                  <div>• Google OAuth Client ID</div>
                  <div>• Google OAuth Client Credentials</div>
                  <div>• Authorized Redirect URI</div>
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

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link to="/student" className="flex flex-col items-center gap-1 text-blue-600">
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link to="/student/upcoming" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-medium">Upcoming</span>
        </Link>
        <Link to="/student/calendar" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <CalendarDays className="w-6 h-6" />
          <span className="text-[10px] font-medium">Calendar</span>
        </Link>
        <Link to="/student/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}

