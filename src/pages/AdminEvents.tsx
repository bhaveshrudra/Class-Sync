import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  Power, 
  CalendarDays, 
  X 
} from 'lucide-react';
import type { AcademicEvent, EventType } from '../types';
import { formatDate, formatTime, getEventBadgeColor } from '../utils/eventUtils';
import { deleteEventAttachment } from '../utils/storageUtils';

const EVENT_TYPES: ('All' | EventType)[] = [
  'All',
  'Assignment',
  'Submission',
  'Class Test',
  'Internal Exam',
  'Semester Exam',
  'Lab Exam',
  'Important Notice',
  'Other',
];

export default function AdminEvents() {
  const { logout, user } = useAuth();
  const { events, deleteEvent, toggleEventActive, error: eventsError } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | EventType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Deletion Modal State
  const [eventToDelete, setEventToDelete] = useState<AcademicEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success Notification Message
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Pick up notification from navigation redirect (e.g. from create/edit event)
  useEffect(() => {
    if (location.state && (location.state as { successMessage?: string }).successMessage) {
      setNotificationMsg((location.state as { successMessage?: string }).successMessage || null);
      // Clean up window history state
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => {
        setNotificationMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        (event.subject && event.subject.toLowerCase().includes(q)) ||
        (event.description && event.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Type Filter
      if (typeFilter !== 'All' && event.type !== typeFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter === 'Active' && !event.is_active) {
        return false;
      }
      if (statusFilter === 'Inactive' && event.is_active) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, typeFilter, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      if (eventToDelete.attachment_url) {
        // Attempt storage cleanup in background
        deleteEventAttachment(eventToDelete.attachment_url).catch((e) => {
          console.warn('Storage cleanup warning:', e);
        });
      }
      const deleted = await deleteEvent(eventToDelete.id);
      if (deleted) {
        setNotificationMsg('Event deleted successfully.');
        setTimeout(() => setNotificationMsg(null), 4000);
      } else {
        setNotificationMsg(eventsError || 'Could not delete the event. Please try again.');
        setTimeout(() => setNotificationMsg(null), 4000);
      }
      setEventToDelete(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setNotificationMsg('Could not delete the event. Please try again.');
      setTimeout(() => setNotificationMsg(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const success = await toggleEventActive(id);
    if (!success) {
      setNotificationMsg(eventsError || 'Could not update event status. Please try again.');
      setTimeout(() => setNotificationMsg(null), 4000);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setStatusFilter('All');
  };

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'All' || statusFilter !== 'All';

  // Helper for icon based on type
  const getEventIcon = (type: AcademicEvent['type']) => {
    switch (type) {
      case 'Assignment':
      case 'Submission':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'Class Test':
      case 'Internal Exam':
        return <BookOpen className="w-3.5 h-3.5 text-purple-600" />;
      case 'Semester Exam':
      case 'Lab Exam':
        return <GraduationCap className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
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
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/admin/events" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold transition-colors shadow-2xs"
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

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-12">
        {/* Success Notification Banner */}
        {notificationMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
            <button 
              onClick={() => setNotificationMsg(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Academic Event Management
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-0.5">
              Create, edit, toggle, and manage schedule notices for students.
            </p>
          </div>

          <Link
            to="/admin/events/create"
            id="admin-create-event-btn"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-2xs border border-slate-200/80 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, or description..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['All', 'Active', 'Inactive'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      statusFilter === status
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              Type:
            </span>
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border ${
                  typeFilter === type
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Filter Status Meta */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div>
                Showing <span className="font-bold text-slate-800">{filteredEvents.length}</span> of {events.length} events
              </div>
              <button
                onClick={clearFilters}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* Event List / Table */}
        {events.length === 0 ? (
          /* Empty state: No events created at all */
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-slate-200/80 border-dashed text-center shadow-xs">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">No events created yet.</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-5">
              Create your first academic event, test, assignment, or schedule notice for students.
            </p>
            <Link
              to="/admin/events/create"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Create your first event
            </Link>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty state: No search or filter match */
          <div className="bg-white rounded-3xl p-10 border border-slate-200/80 border-dashed text-center shadow-xs">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">No matching events found.</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
              We couldn't find any academic events matching your search criteria or active filters.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
            >
              Clear filters and show all
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Event Details</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Deadline</th>
                    <th className="py-3.5 px-4">Target Class</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">{event.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{event.subject || 'General Academic'}</div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${getEventBadgeColor(event.type)}`}>
                          {getEventIcon(event.type)}
                          {event.type}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600">
                        {event.start_time ? (
                          <div>
                            <div className="font-medium text-slate-900">{formatDate(event.start_time)}</div>
                            <div className="text-slate-400">{formatTime(event.start_time)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600">
                        {event.deadline ? (
                          <div>
                            <div className="font-semibold text-orange-700">{formatDate(event.deadline)}</div>
                            <div className="text-orange-500">{formatTime(event.deadline)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {event.year === 'All' ? 'All Yrs' : `Y${event.year}`} · {event.branch} · {event.section === 'All' ? 'All' : `Sec ${event.section}`}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {event.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => handleToggleStatus(event.id)}
                            title={event.is_active ? 'Deactivate event' : 'Activate event'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              event.is_active
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200'
                                : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <Link
                            to={`/admin/events/${event.id}/edit`}
                            title="Edit Event"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => setEventToDelete(event)}
                            title="Delete Event"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-4 md:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${getEventBadgeColor(event.type)}`}>
                          {getEventIcon(event.type)}
                          {event.type}
                        </span>
                        {event.subject && (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {event.subject}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {event.title}
                      </h3>
                    </div>

                    <div>
                      {event.is_active ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-slate-600 text-xs md:text-sm line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    {event.start_time && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(event.start_time)} ({formatTime(event.start_time)})</span>
                      </div>
                    )}
                    {event.deadline && (
                      <div className="flex items-center gap-1 text-orange-600 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>Due: {formatDate(event.deadline)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Target: {event.year === 'All' ? 'All Yrs' : `Y${event.year}`} · {event.branch} ({event.section})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(event.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          event.is_active
                            ? 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {event.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <Link
                        to={`/admin/events/${event.id}/edit`}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setEventToDelete(event)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {eventToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Delete this event?
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  This action cannot be undone. Are you sure you want to permanently remove <span className="font-semibold text-slate-800">"{eventToDelete.title}"</span>?
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link 
          to="/admin" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link 
          to="/admin/events" 
          className="flex flex-col items-center gap-1 text-indigo-600 font-bold"
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
