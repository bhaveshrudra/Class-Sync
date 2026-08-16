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
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import type { AcademicEvent } from '../types';

export default function StudentDashboard() {
  const { logout, user } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const studentName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';

  const { upcomingEvents, assignmentsCount, testsCount, examsCount, upcomingCount } = useMemo(() => {
    const now = new Date();
    const upcoming = events
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
  }, [events]);

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

