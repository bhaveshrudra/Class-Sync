import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useNavigate, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { 
  LogOut, 
  User, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  CalendarDays,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  CalendarCheck2,
  Sparkles
} from 'lucide-react';
import type { AcademicEvent } from '../types';
import { 
  groupAndSortEvents, 
  getEventStatusLabel, 
  formatDate, 
  formatTime 
} from '../utils/eventUtils';

export default function StudentUpcoming() {
  const { logout } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Group and sort active upcoming events based on current system time
  const now = useMemo(() => new Date(), []);
  
  const { today, tomorrow, thisWeek, later, totalUpcomingCount } = useMemo(() => {
    const grouped = groupAndSortEvents(events, now);
    const total = grouped.today.length + grouped.tomorrow.length + grouped.thisWeek.length + grouped.later.length;
    return { ...grouped, totalUpcomingCount: total };
  }, [events, now]);

  const getEventIcon = (type: AcademicEvent['type']) => {
    switch (type) {
      case 'Assignment':
      case 'Submission':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'Class Test':
      case 'Internal Exam':
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case 'Semester Exam':
      case 'Lab Exam':
        return <GraduationCap className="w-4 h-4 text-rose-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getEventBadgeColor = (type: AcademicEvent['type']) => {
    switch (type) {
      case 'Assignment':
      case 'Submission':
        return 'bg-blue-50 text-blue-700 border-blue-200/60';
      case 'Class Test':
      case 'Internal Exam':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'Semester Exam':
      case 'Lab Exam':
        return 'bg-rose-50 text-rose-700 border-rose-200/60';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
    }
  };

  const getStatusBadgeColor = (statusLabel: string) => {
    if (statusLabel === 'Today') {
      return 'bg-amber-500 text-white font-semibold shadow-sm';
    }
    if (statusLabel === 'Tomorrow') {
      return 'bg-blue-600 text-white font-medium shadow-sm';
    }
    if (statusLabel.startsWith('Due in')) {
      return 'bg-orange-50 text-orange-700 border border-orange-200 font-medium';
    }
    if (statusLabel.startsWith('Exam in') || statusLabel.startsWith('Test in')) {
      return 'bg-purple-50 text-purple-700 border border-purple-200 font-medium';
    }
    return 'bg-slate-100 text-slate-700 font-medium';
  };

  const renderEventCard = (event: AcademicEvent) => {
    const statusLabel = getEventStatusLabel(event, now);

    return (
      <Link 
        key={event.id}
        to={`/student/events/${event.id}`}
        id={`event-card-${event.id}`}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/70 hover:shadow-md hover:border-blue-200 transition-all flex flex-col gap-3 group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getEventBadgeColor(event.type)}`}>
              {getEventIcon(event.type)}
              {event.type}
            </span>
            {event.subject && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {event.subject}
              </span>
            )}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 ${getStatusBadgeColor(statusLabel)}`}>
            {statusLabel}
          </span>
        </div>

        <div>
          <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-slate-600 text-sm mt-1.5 leading-relaxed line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
            {event.start_time && (
              <div className="flex items-center gap-1.5 font-medium">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span>{formatDate(event.start_time)} · {formatTime(event.start_time)}</span>
              </div>
            )}
            {event.deadline && (
              <div className="flex items-center gap-1.5 font-semibold text-orange-600">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Due: {formatDate(event.deadline)} {formatTime(event.deadline)}</span>
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-blue-600 group-hover:underline">
            View Details →
          </span>
        </div>
      </Link>
    );
  };

  const renderGroupSection = (title: string, events: AcademicEvent[], groupKey: string) => {
    return (
      <section key={groupKey} className="space-y-3" id={`group-section-${groupKey}`}>
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900">
              {title}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {events.length}
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-200/60 border-dashed bg-slate-50/60 text-slate-400 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-300" />
            <span>No events here</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {events.map(event => renderEventCard(event))}
          </div>
        )}
      </section>
    );
  };

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
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold transition-colors shadow-xs"
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
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            Academic Timeline
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Upcoming Events
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Stay ahead of your academic deadlines.
          </p>
        </header>

        {totalUpcomingCount === 0 ? (
          <div className="bg-white p-10 md:p-14 rounded-3xl border border-slate-200/80 border-dashed flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
              <CalendarCheck2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">You're all caught up!</h2>
            <p className="text-slate-500 text-sm max-w-sm">No upcoming academic events scheduled at this moment.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {renderGroupSection('Today', today, 'today')}
            {renderGroupSection('Tomorrow', tomorrow, 'tomorrow')}
            {renderGroupSection('This Week', thisWeek, 'this-week')}
            {renderGroupSection('Later', later, 'later')}
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
          className="flex flex-col items-center gap-1 text-blue-600 font-bold"
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
