import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useNavigate, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { 
  LogOut, 
  Users, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  PlusCircle, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  CalendarDays 
} from 'lucide-react';
import { mockStudents } from '../data/mockStudents';
import type { AcademicEvent } from '../types';
import { formatDate, getEventBadgeColor } from '../utils/eventUtils';

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const {
    totalStudentsCount,
    activeEventsCount,
    assignmentsCount,
    testsCount,
    examsCount,
    recentEvents,
    upcomingDeadlines
  } = useMemo(() => {
    const now = new Date();
    
    // Calculations from shared events state
    const studentsCount = mockStudents.length;
    const activeCount = events.filter((e) => e.is_active).length;
    const assignments = events.filter(
      (e) => e.is_active && (e.type === 'Assignment' || e.type === 'Submission')
    ).length;
    const tests = events.filter(
      (e) => e.is_active && (e.type === 'Class Test' || e.type === 'Internal Exam')
    ).length;
    const exams = events.filter(
      (e) => e.is_active && (e.type === 'Semester Exam' || e.type === 'Lab Exam')
    ).length;

    // Recent events (sorted newest first by created_at)
    const recent = [...events]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // Upcoming deadlines (events with deadline in future, sorted by nearest deadline)
    const upcoming = events
      .filter((e) => e.deadline && new Date(e.deadline).getTime() >= now.getTime() && e.is_active)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 4);

    return {
      totalStudentsCount: studentsCount,
      activeEventsCount: activeCount,
      assignmentsCount: assignments,
      testsCount: tests,
      examsCount: exams,
      recentEvents: recent,
      upcomingDeadlines: upcoming
    };
  }, [events]);

  // Helper for event type icons
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 leading-tight block">ClassSync Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/events/create"
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Create Event"
          >
            <PlusCircle className="w-5 h-5" />
          </Link>
          <button 
            onClick={handleLogout} 
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 block leading-tight">ClassSync</span>
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Faculty Portal</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <Link 
            to="/admin" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold transition-colors shadow-2xs"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/admin/events" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Events
          </Link>
          <Link 
            to="/admin/events/create" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Create Event
          </Link>
          <Link 
            to="/admin/students" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <Users className="w-5 h-5" />
            Students
          </Link>
        </nav>

        {/* User Identity and Logout */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-3">
          <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs font-bold text-slate-800 truncate">{user?.email || 'admin@classsync.com'}</div>
            <div className="text-[10px] text-slate-500 font-medium">Administrator</div>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-12">
        {/* Header section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                Administration Hub
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-0.5">
              Manage academic events, coordinate deadlines, and monitor student engagement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/events/create"
              id="admin-create-event-top-btn"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </Link>
          </div>
        </header>

        {/* 5 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8" id="admin-summary-cards">
          {/* Card 1: Total Students */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Students</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{totalStudentsCount}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">Enrolled demo students</div>
            </div>
          </div>

          {/* Card 2: Active Events */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Events</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{activeEventsCount}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">Total active schedule</div>
            </div>
          </div>

          {/* Card 3: Assignments */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignments</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{assignmentsCount}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">Tasks & submissions</div>
            </div>
          </div>

          {/* Card 4: Tests */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tests & Quizzes</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{testsCount}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">Class & internals</div>
            </div>
          </div>

          {/* Card 5: Exams */}
          <div className="col-span-2 sm:col-span-1 bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exams</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{examsCount}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">Semester & labs</div>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Recent Events and Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Events (2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-slate-900">Recent Events</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {recentEvents.length}
                </span>
              </div>
              <Link 
                to="/admin/events" 
                className="text-xs md:text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 border-dashed text-center">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No events created yet.</p>
                <Link
                  to="/admin/events/create"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create your first event
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Event & Subject</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Target</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 max-w-xs truncate">{event.title}</div>
                            <div className="text-xs text-slate-500">{event.subject || 'General'}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getEventBadgeColor(event.type)}`}>
                              {getEventIcon(event.type)}
                              {event.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                            {event.year === 'All' ? 'All Yrs' : `Y${event.year}`} · {event.branch} · {event.section === 'All' ? 'All' : `Sec ${event.section}`}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {event.is_active ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                <XCircle className="w-3 h-3 text-slate-400" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              to={`/admin/events/${event.id}/edit`}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Recent Events */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">{event.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{event.subject || 'General'}</p>
                        </div>
                        {event.is_active ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${getEventBadgeColor(event.type)}`}>
                          {event.type}
                        </span>
                        <Link
                          to={`/admin/events/${event.id}/edit`}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Edit →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Deadlines (1 column on large screens) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Upcoming Deadlines</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                {upcomingDeadlines.length}
              </span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 border-dashed text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No upcoming deadlines.</p>
                <p className="text-xs text-slate-500 mt-1">There are no pending submission deadlines right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((event) => (
                  <div 
                    key={event.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:border-indigo-200 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {event.subject || 'General'}
                      </span>
                      <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
                        Due {formatDate(event.deadline)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {event.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-medium">
                        Target: {event.year === 'All' ? 'All Yrs' : `Y${event.year}`} · {event.branch} ({event.section})
                      </span>
                      <Link 
                        to={`/admin/events/${event.id}/edit`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link 
          to="/admin" 
          className="flex flex-col items-center gap-1 text-indigo-600 font-bold"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link 
          to="/admin/events" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">Events</span>
        </Link>
        <Link 
          to="/admin/events/create" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Create</span>
        </Link>
        <Link 
          to="/admin/students" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Students</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}
