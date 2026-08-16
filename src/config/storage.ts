// Supabase Storage Configuration for ClassSync

export const STORAGE_CONFIG = {
  BUCKET_NAME: 'academic-attachments',
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ],
  ALLOWED_EXTENSIONS: [
    '.pdf',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
  ],
} as const;
