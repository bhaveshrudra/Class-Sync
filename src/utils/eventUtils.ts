import type { AcademicEvent } from '../types';

export interface GroupedEvents {
  today: AcademicEvent[];
  tomorrow: AcademicEvent[];
  thisWeek: AcademicEvent[];
  later: AcademicEvent[];
}

/**
 * Gets the primary comparative date for an event (start_time or deadline or created_at)
 */
export function getEventDate(event: AcademicEvent): Date {
  // If an event has a start_time, that's usually when it occurs/starts.
  // For assignments with only a deadline, deadline is the target date.
  const dateStr = event.deadline || event.start_time || event.created_at;
  return new Date(dateStr);
}

/**
 * Returns start of the day for a given date in local time
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculates days difference between two dates ignoring time
 */
export function getDaysDifference(targetDate: Date, baseDate: Date = new Date()): number {
  const targetMidnight = startOfDay(targetDate).getTime();
  const baseMidnight = startOfDay(baseDate).getTime();
  const diffTime = targetMidnight - baseMidnight;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a status badge label with countdown text (e.g., "Today", "Tomorrow", "Due in 3 days", "Exam in 5 days")
 */
export function getEventStatusLabel(event: AcademicEvent, now: Date = new Date()): string {
  const eventDate = getEventDate(event);
  const daysDiff = getDaysDifference(eventDate, now);

  const isExam = event.type === 'Semester Exam' || event.type === 'Internal Exam' || event.type === 'Lab Exam';
  const isTest = event.type === 'Class Test';
  const isAssignment = event.type === 'Assignment' || event.type === 'Submission';

  if (daysDiff === 0) {
    return 'Today';
  } else if (daysDiff === 1) {
    return 'Tomorrow';
  } else if (daysDiff > 1) {
    if (isExam) {
      return `Exam in ${daysDiff} days`;
    } else if (isTest) {
      return `Test in ${daysDiff} days`;
    } else if (isAssignment) {
      return `Due in ${daysDiff} days`;
    }
    return `In ${daysDiff} days`;
  } else {
    return 'Past';
  }
}

/**
 * Filters for future/relevant events and groups them into Today, Tomorrow, This Week, and Later.
 * Sorts each group chronologically by date and time (earliest first).
 */
export function groupAndSortEvents(events: AcademicEvent[], now: Date = new Date()): GroupedEvents {
  const today: AcademicEvent[] = [];
  const tomorrow: AcademicEvent[] = [];
  const thisWeek: AcademicEvent[] = [];
  const later: AcademicEvent[] = [];

  // Filter active events that have not yet passed (or are today)
  const activeEvents = events.filter(e => {
    if (!e.is_active) return false;
    const eventDate = getEventDate(e);
    const daysDiff = getDaysDifference(eventDate, now);
    // Include today (0) and future (> 0)
    return daysDiff >= 0;
  });

  for (const event of activeEvents) {
    const eventDate = getEventDate(event);
    const daysDiff = getDaysDifference(eventDate, now);

    if (daysDiff === 0) {
      today.push(event);
    } else if (daysDiff === 1) {
      tomorrow.push(event);
    } else if (daysDiff >= 2 && daysDiff <= 7) {
      thisWeek.push(event);
    } else {
      later.push(event);
    }
  }

  // Sorting comparator: earliest date/time first
  const sortComparator = (a: AcademicEvent, b: AcademicEvent) => {
    const timeA = getEventDate(a).getTime();
    const timeB = getEventDate(b).getTime();
    return timeA - timeB;
  };

  today.sort(sortComparator);
  tomorrow.sort(sortComparator);
  thisWeek.sort(sortComparator);
  later.sort(sortComparator);

  return { today, tomorrow, thisWeek, later };
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

export function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  return new Date(dateString).toLocaleTimeString('en-US', options);
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function formatFullDateWithWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getEventsForDate(events: AcademicEvent[], targetDate: Date): AcademicEvent[] {
  return events.filter(e => {
    if (!e.is_active) return false;
    const eventDate = getEventDate(e);
    return isSameDay(eventDate, targetDate);
  }).sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime());
}

export function getEventsForMonth(events: AcademicEvent[], year: number, monthIndex: number): AcademicEvent[] {
  return events.filter(e => {
    if (!e.is_active) return false;
    const eventDate = getEventDate(e);
    return eventDate.getFullYear() === year && eventDate.getMonth() === monthIndex;
  }).sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime());
}

export function getEventBadgeColor(type: AcademicEvent['type']): string {
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
}

export function getStatusBadgeColor(statusLabel: string): string {
  if (statusLabel === 'Today') {
    return 'bg-amber-500 text-white font-semibold shadow-xs';
  }
  if (statusLabel === 'Tomorrow') {
    return 'bg-blue-600 text-white font-medium shadow-xs';
  }
  if (statusLabel.startsWith('Due in')) {
    return 'bg-orange-50 text-orange-700 border border-orange-200 font-medium';
  }
  if (statusLabel.startsWith('Exam in') || statusLabel.startsWith('Test in')) {
    return 'bg-purple-50 text-purple-700 border border-purple-200 font-medium';
  }
  if (statusLabel === 'Past') {
    return 'bg-slate-100 text-slate-500 border border-slate-200 font-medium';
  }
  return 'bg-slate-100 text-slate-700 font-medium';
}

