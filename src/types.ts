export type EventType = 
  | 'Assignment' 
  | 'Submission' 
  | 'Class Test' 
  | 'Internal Exam' 
  | 'Semester Exam' 
  | 'Lab Exam' 
  | 'Important Notice' 
  | 'Other';

export type TargetYear = '1' | '2' | '3' | '4' | 'All';
export type TargetBranch = 'CSE' | 'ECE' | 'EEE' | 'ME' | 'CIVIL' | 'All';
export type TargetSection = 'A' | 'B' | 'C' | 'All';

export interface AcademicEvent {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  subject: string | null;
  start_time: string | null;
  deadline: string | null;
  year: TargetYear;
  branch: TargetBranch;
  section: TargetSection;
  attachment_url: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  google_email: string | null;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncStatus = 'synced' | 'failed' | 'pending' | 'cancelled';

export interface CalendarEventSync {
  id: string;
  academic_event_id: string;
  user_id: string;
  google_event_id: string;
  sync_status: SyncStatus;
  last_synced_at: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarStatusResponse {
  configured: boolean;
  connected: boolean;
  connection?: CalendarConnection | null;
  error?: string;
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'deleted' | 'skipped' | 'failed';
  google_event_id?: string;
  error?: string;
  syncRecord?: CalendarEventSync;
}

export interface BatchSyncResult {
  total: number;
  synced: number;
  updated: number;
  failed: number;
  results: Array<{
    event_id: string;
    title: string;
    result: GoogleCalendarSyncResult;
  }>;
}

