import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { 
  ArrowLeft, 
  AlertCircle, 
  ShieldCheck, 
  LayoutDashboard, 
  Calendar, 
  PlusCircle, 
  Users, 
  LogOut 
} from 'lucide-react';
import EventForm from '../components/EventForm';
import type { EventFormValues } from '../components/EventForm';

export default function AdminEditEvent() {
  const { id } = useParams<{ id: string }>();
  const { logout, user } = useAuth();
  const { getEventById, updateEvent, loading } = useEvents();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const event = id ? getEventById(id) : undefined;

  const handleEditSubmit = async (values: EventFormValues) => {
    if (!id || !event) return;

    // Construct start_time ISO
    let start_time_iso: string | null = null;
    if (values.startDate) {
      const timePart = values.startTime || '09:00';
      start_time_iso = new Date(`${values.startDate}T${timePart}:00`).toISOString();
    }

    // Construct deadline ISO
    let deadline_iso: string | null = null;
    if (values.hasDeadline && values.deadlineDate) {
      const timePart = values.deadlineTime || '23:59';
      deadline_iso = new Date(`${values.deadlineDate}T${timePart}:00`).toISOString();
    }

    const success = await updateEvent(id, {
      title: values.title,
      subject: values.subject || null,
      description: values.description || null,
      type: values.type,
      start_time: start_time_iso,
      deadline: deadline_iso,
      year: values.year,
      branch: values.branch,
      section: values.section,
      attachment_url: values.attachmentUrl || null,
      is_active: values.isActive,
    });

    if (success) {
      navigate('/admin/events', {
        state: {
          successMessage: 'Event updated successfully.',
        },
      });
    } else {
      throw new Error('Could not update event. Please check your permissions and try again.');
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
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 md:pb-12">
        <div className="mb-6">
          <Link
            to="/admin/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 px-3.5 py-2 rounded-xl border border-slate-200 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-slate-200/80 border-dashed text-center shadow-xs">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Loading event...</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Fetching the latest event details.
            </p>
          </div>
        ) : !event ? (
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-slate-200/80 border-dashed text-center shadow-xs">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found.</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              The requested academic event could not be found, has an invalid identifier, or may have been deleted.
            </p>
            <Link
              to="/admin/events"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Edit Schedule Item</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Edit Event
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Update details for <span className="font-semibold text-slate-700">"{event.title}"</span>. Changes will update every student and administrative view immediately.
              </p>
            </div>

            <EventForm
              mode="edit"
              initialData={event}
              onSubmit={handleEditSubmit}
            />
          </div>
        )}
      </main>
    </div>
  );
}
