import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Save, 
  PlusCircle, 
  Calendar, 
  AlertCircle, 
  FileText, 
  Users, 
  Layers, 
  Link as LinkIcon,
  UploadCloud,
  File,
  X,
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import type { AcademicEvent, EventType, TargetYear, TargetBranch, TargetSection } from '../types';
import { 
  uploadEventAttachment, 
  validateAttachmentFile, 
  formatFileSize, 
  getFilenameFromUrl 
} from '../utils/storageUtils';
import { STORAGE_CONFIG } from '../config/storage';

const EVENT_TYPES: EventType[] = [
  'Assignment',
  'Submission',
  'Class Test',
  'Internal Exam',
  'Semester Exam',
  'Lab Exam',
  'Important Notice',
  'Other',
];

const YEARS: TargetYear[] = ['1', '2', '3', '4', 'All'];
const BRANCHES: TargetBranch[] = ['CSE', 'ECE', 'EEE', 'ME', 'CIVIL', 'All'];
const SECTIONS: TargetSection[] = ['A', 'B', 'C', 'All'];

export interface EventFormValues {
  title: string;
  subject: string;
  description: string;
  type: EventType;
  startDate: string;
  startTime: string;
  hasDeadline: boolean;
  deadlineDate: string;
  deadlineTime: string;
  year: TargetYear;
  branch: TargetBranch;
  section: TargetSection;
  attachmentUrl: string;
  isActive: boolean;
}

interface EventFormProps {
  mode: 'create' | 'edit';
  initialData?: AcademicEvent;
  onSubmit: (values: EventFormValues) => Promise<void> | void;
}

export default function EventForm({ mode, initialData, onSubmit }: EventFormProps) {
  // Helper to extract YYYY-MM-DD from ISO
  const extractDate = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  // Helper to extract HH:MM from ISO
  const extractTime = (isoString?: string | null, fallback = '09:00'): string => {
    if (!isoString) return fallback;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return fallback;
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${min}`;
    } catch {
      return fallback;
    }
  };

  // Initialize fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState<EventType>(initialData?.type || 'Assignment');

  const defaultDate = mode === 'create' ? extractDate(new Date().toISOString()) : extractDate(initialData?.start_time);
  const [startDate, setStartDate] = useState(defaultDate || extractDate(new Date().toISOString()));
  const [startTime, setStartTime] = useState(initialData?.start_time ? extractTime(initialData.start_time) : '10:00');

  const [hasDeadline, setHasDeadline] = useState(Boolean(initialData?.deadline));
  const [deadlineDate, setDeadlineDate] = useState(extractDate(initialData?.deadline));
  const [deadlineTime, setDeadlineTime] = useState(initialData?.deadline ? extractTime(initialData.deadline, '23:59') : '23:59');

  const [year, setYear] = useState<TargetYear>(initialData?.year || 'All');
  const [branch, setBranch] = useState<TargetBranch>(initialData?.branch || 'All');
  const [section, setSection] = useState<TargetSection>(initialData?.section || 'All');

  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || '');
  const [isActive, setIsActive] = useState(initialData ? initialData.is_active : true);

  // Storage Attachment State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    initialData?.attachment_url ? getFilenameFromUrl(initialData.attachment_url) : ''
  );
  const [uploadedFileSize, setUploadedFileSize] = useState<number | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);

    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file.');
      return;
    }

    setIsUploading(true);
    const tempId = initialData?.id || `temp_${Date.now()}`;

    try {
      const result = await uploadEventAttachment(file, tempId);
      if (result.success && result.publicUrl) {
        setAttachmentUrl(result.publicUrl);
        setUploadedFileName(result.fileName || file.name);
        setUploadedFileSize(result.fileSize || file.size);
        setUploadSuccess(true);
      } else {
        setUploadError(result.error || 'Failed to upload attachment.');
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Unexpected file upload error.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl('');
    setUploadedFileName('');
    setUploadedFileSize(undefined);
    setUploadSuccess(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    }

    if (!subject.trim()) {
      newErrors.subject = 'Subject is required.';
    }

    if (!type) {
      newErrors.type = 'Event type is required.';
    }

    if (!startDate) {
      newErrors.startDate = 'Date is required.';
    }

    if (!startTime) {
      newErrors.startTime = 'Time is required.';
    }

    if (hasDeadline) {
      if (!deadlineDate) {
        newErrors.deadlineDate = 'Deadline date is required when deadline is enabled.';
      } else if (startDate && deadlineDate) {
        const startDateTime = new Date(`${startDate}T${startTime || '00:00'}:00`);
        const deadlineDateTime = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`);

        if (deadlineDateTime.getTime() < startDateTime.getTime()) {
          newErrors.deadlineDate = 'Deadline cannot be earlier than the event start date/time.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      setGeneralError('Please correct the highlighted fields before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim(),
        type,
        startDate,
        startTime,
        hasDeadline,
        deadlineDate,
        deadlineTime,
        year,
        branch,
        section,
        attachmentUrl: attachmentUrl.trim(),
        isActive,
      });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error && err.message
        ? err.message
        : 'An unexpected error occurred. Please try again.';
      setGeneralError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {generalError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* SECTION 1: Event Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <FileText className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Event Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Linked List Assignment"
              className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-medium ${
                errors.title
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30'
                  : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
            {errors.title && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
              }}
              placeholder="e.g. Data Structures"
              className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-medium ${
                errors.subject
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30'
                  : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
            {errors.subject && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.subject}
              </p>
            )}
          </div>

          {/* Event Type */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Event Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as EventType);
                if (errors.type) setErrors((prev) => ({ ...prev, type: '' }));
              }}
              className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-semibold text-slate-800 ${
                errors.type
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.type}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide instructions, syllabus coverage, submission guidelines, or important information..."
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-normal"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Schedule & Deadlines */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Schedule & Deadlines
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Date */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
              }}
              className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                errors.startDate
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30'
                  : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
            {errors.startDate && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.startDate}
              </p>
            )}
          </div>

          {/* Scheduled Time */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: '' }));
              }}
              className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                errors.startTime
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30'
                  : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
            />
            {errors.startTime && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.startTime}
              </p>
            )}
          </div>
        </div>

        {/* Submission Deadline Option */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase block">Submission Deadline</span>
              <span className="text-xs text-slate-500">
                Specify a final due date and time for assignments or submissions
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasDeadline}
                onChange={(e) => {
                  setHasDeadline(e.target.checked);
                  if (!e.target.checked) {
                    setErrors((prev) => ({ ...prev, deadlineDate: '' }));
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {hasDeadline && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 animate-in fade-in">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-orange-800 uppercase">
                  Deadline Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => {
                    setDeadlineDate(e.target.value);
                    if (errors.deadlineDate) setErrors((prev) => ({ ...prev, deadlineDate: '' }));
                  }}
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 ${
                    errors.deadlineDate
                      ? 'border-rose-300 focus:ring-rose-500/20'
                      : 'border-orange-200 focus:ring-orange-500/20'
                  }`}
                />
                {errors.deadlineDate && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.deadlineDate}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-orange-800 uppercase">
                  Deadline Time
                </label>
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-orange-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Target Audience */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <Users className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Target Audience
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Year */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value as TargetYear)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-semibold"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y === 'All' ? 'All Years' : `Year ${y}`}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Branch <span className="text-rose-500">*</span>
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value as TargetBranch)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-semibold"
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Branches' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Section <span className="text-rose-500">*</span>
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as TargetSection)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-semibold"
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Sections' : `Section ${s}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 4: Supabase Storage Attachments & Status */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <Layers className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Academic Attachments & Status
          </h2>
        </div>

        {/* Supabase Storage Upload Control */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              Event Attachment <span className="text-slate-400 font-normal">(Optional)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              PDF, DOC, DOCX, PPT, PPTX, Images (Max {STORAGE_CONFIG.MAX_FILE_SIZE_MB}MB)
            </span>
          </label>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          {/* Attached File Card (When attached) */}
          {attachmentUrl ? (
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <File className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {uploadedFileName || getFilenameFromUrl(attachmentUrl) || 'Attached Resource'}
                    </p>
                    {uploadSuccess && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {uploadedFileSize && <span>{formatFileSize(uploadedFileSize)}</span>}
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-medium"
                    >
                      Preview Link <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Upload Drag & Drop Zone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-700">Uploading attachment to Supabase Storage...</p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Click to choose file or drag and drop
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      PDF, Word, PowerPoint, or images up to 10MB
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Alternative External Link Input */}
          <div className="pt-2">
            <details className="group text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1.5 select-none">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                Or provide an external web resource URL manually
              </summary>
              <div className="mt-2 space-y-1 pl-4 border-l-2 border-slate-200">
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => {
                    setAttachmentUrl(e.target.value);
                    setUploadedFileName(getFilenameFromUrl(e.target.value));
                  }}
                  placeholder="https://example.com/materials/instructions.pdf"
                  className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
                />
              </div>
            </details>
          </div>
        </div>

        {/* Active status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase block">Active Status</span>
            <span className="text-xs text-slate-500">
              {isActive
                ? 'Visible to students immediately on their Dashboard, Upcoming feed, and Calendar.'
                : 'Hidden from student views. Remains accessible to administrators for editing.'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
        <Link
          to="/admin/events"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50"
        >
          {mode === 'create' ? (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Event...' : 'Create Event'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

