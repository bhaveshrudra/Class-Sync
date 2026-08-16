import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useNavigate, Link } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import type { AcademicEvent } from '../types';
import { 
  getEventStatusLabel, 
  getEventsForDate,
  getEventsForMonth,
  formatDate, 
  formatTime,
  formatFullDateWithWeekday,
  isSameDay,
  getEventBadgeColor,
  getStatusBadgeColor
} from '../utils/eventUtils';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StudentCalendar() {
  const { logout } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();

  // Current system date
  const now = new Date();

  // Active viewing month and year
  const [currentDate, setCurrentDate] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  // Currently selected day (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(now);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // First day of month and total days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Events in current selected month
  const monthEvents = getEventsForMonth(events, year, month);

  // Events for selected day
  const selectedDayEvents = getEventsForDate(events, selectedDate);

  // Helper for icon based on type
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

  // Generate calendar grid cells
  const calendarCells = [];

  // 1. Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dayEvents = getEventsForDate(events, prevDate);
    calendarCells.push({
      date: prevDate,
      dayNum,
      isCurrentMonth: false,
      events: dayEvents
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dayEvents = getEventsForDate(events, cellDate);
    calendarCells.push({
      date: cellDate,
      dayNum: day,
      isCurrentMonth: true,
      events: dayEvents
    });
  }

  // 3. Next month leading days (fill out final week grid to multiple of 7)
  const remainingCells = 7 - (calendarCells.length % 7);
  if (remainingCells < 7) {
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      const dayEvents = getEventsForDate(events, nextDate);
      calendarCells.push({
        date: nextDate,
        dayNum: day,
        isCurrentMonth: false,
        events: dayEvents
      });
    }
  }

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
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold transition-colors shadow-xs"
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
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-12">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Academic Calendar
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Track and inspect your classes, exams, tests, and deadlines by date.
          </p>
        </header>

        {/* Calendar Card */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200/80 mb-8">
          {/* Calendar Header Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {monthName}
              </h2>
              {monthEvents.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 text-xs md:text-sm font-semibold rounded-xl text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
              >
                Today
              </button>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 my-3 text-center">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-xs font-bold text-slate-400 py-1 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {calendarCells.map((cell, index) => {
              const isTodayCell = isSameDay(cell.date, now);
              const isSelectedCell = isSameDay(cell.date, selectedDate);
              const hasEvents = cell.events.length > 0;

              return (
                <button
                  key={`${cell.date.toISOString()}-${index}`}
                  onClick={() => {
                    setSelectedDate(cell.date);
                    if (!cell.isCurrentMonth) {
                      setCurrentDate(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                    }
                  }}
                  className={`min-h-[64px] md:min-h-[82px] p-1.5 md:p-2 rounded-2xl flex flex-col items-center justify-between transition-all relative text-left border ${
                    isSelectedCell 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30'
                      : isTodayCell
                        ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-semibold'
                        : cell.isCurrentMonth
                          ? 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                          : 'bg-slate-50/50 hover:bg-slate-100/60 border-transparent text-slate-400'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span 
                      className={`text-xs md:text-sm font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isSelectedCell
                          ? 'bg-white/20 text-white'
                          : isTodayCell
                            ? 'bg-blue-600 text-white font-bold'
                            : ''
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {hasEvents && (
                      <span 
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelectedCell
                            ? 'bg-white text-blue-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {cell.events.length}
                      </span>
                    )}
                  </div>

                  {/* Indicators for event dots */}
                  {hasEvents && (
                    <div className="w-full flex flex-wrap gap-1 mt-1 justify-center">
                      {cell.events.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                            isSelectedCell
                              ? 'bg-white'
                              : e.type === 'Semester Exam' || e.type === 'Lab Exam'
                                ? 'bg-rose-500'
                                : e.type === 'Class Test' || e.type === 'Internal Exam'
                                  ? 'bg-purple-500'
                                  : 'bg-blue-500'
                          }`}
                          title={`${e.type}: ${e.title}`}
                        />
                      ))}
                      {cell.events.length > 3 && (
                        <span className={`text-[8px] font-bold leading-none ${isSelectedCell ? 'text-white' : 'text-slate-400'}`}>
                          +
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events Section */}
        <div className="space-y-4" id="selected-day-events-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                {formatFullDateWithWeekday(selectedDate)}
              </h2>
              <p className="text-xs md:text-sm text-slate-500">
                {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} scheduled for this day
              </p>
            </div>
            {isSameDay(selectedDate, now) && (
              <span className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">
                Today
              </span>
            )}
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200/80 border-dashed text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                No academic events scheduled.
              </h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                There are no classes, assignments, or examinations recorded for this date. Select another date with event indicators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {selectedDayEvents.map((event) => {
                const statusLabel = getEventStatusLabel(event, now);
                return (
                  <Link
                    key={event.id}
                    to={`/student/events/${event.id}`}
                    id={`calendar-event-card-${event.id}`}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-blue-300 transition-all flex flex-col gap-3 group"
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
                      <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm text-slate-600">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {event.start_time && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>Time: {formatTime(event.start_time)}</span>
                          </div>
                        )}
                        {event.deadline && (
                          <div className="flex items-center gap-1.5 font-semibold text-orange-600">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span>Due: {formatTime(event.deadline)} ({formatDate(event.deadline)})</span>
                          </div>
                        )}
                      </div>

                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
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
          className="flex flex-col items-center gap-1 text-blue-600 font-bold"
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
