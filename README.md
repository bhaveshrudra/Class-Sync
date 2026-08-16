# ClassSync

ClassSync is an academic deadline and reminder platform where administrators publish assignments, tests, exams, submissions, and important academic dates, while students can see the events relevant to them.

The core flow is:
**Admin creates academic event** → **eligible student sees it** → **Google Calendar can be connected** → **applicable events can synchronize** → **Google Calendar handles normal reminders**.

## Features

### Fully Implemented
- **Landing Page**: Clean, modern introduction to the platform.
- **Student Dashboard**: Overview of upcoming academic deadlines and recent announcements.
- **Student Upcoming Events**: Chronological view of active assignments and exams.
- **Student Calendar**: Visual monthly/weekly calendar of academic events.
- **Student Event Details**: Deep-dive into a specific event.
- **Student Profile**: View registered academic cohort details (Year, Branch, Section).
- **Admin Dashboard**: Metrics and quick actions for administrators.
- **Admin Event Management**: Create, edit, and delete academic events targeting specific cohorts.
- **Search & Filters**: Comprehensive search and filtering capabilities for events and students.
- **Admin Student Management**: View directory of registered students.
- **Responsive UI**: Fully mobile, tablet, and desktop responsive design.

### Demo / Local Functionality
- **Authentication**: Authentication currently uses a demo-mode implementation that bypasses a real database verification for local testing and previews.
- **Student Data**: Gracefully falls back to mock student datasets when the Supabase profiles table is empty or unconfigured.

### Externally Configured Functionality
- **Attachments**: Resource attachments require Supabase Storage to be fully configured.
- **Google Calendar Integration**: Synchronization directly depends on valid Google Cloud OAuth Client credentials supplied as environment variables.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Supabase PostgreSQL
- Supabase Storage
- Google OAuth
- Google Calendar API
- Vercel

## Project Structure

```text
src/
  components/       # Reusable UI components (forms, layouts, etc.)
  contexts/         # React context providers (AuthContext, EventsContext)
  lib/              # Library initializations (supabase.ts)
  pages/            # Page-level route components (StudentDashboard, AdminEvents, etc.)
  services/         # API services (googleCalendarService)
  data/             # Mock datasets for fallback states
  utils/            # Helper functions (eventUtils, storageUtils)
  types.ts          # Global TypeScript interfaces
  App.tsx           # Main application shell and routing
  main.tsx          # Application entry point

supabase/
  migrations/       # SQL migration scripts for database schema

public/             # Static assets
```

## Local Development

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Environment Variables

Create a `.env` file based on `.env.example`.

**`.env.example`**:
```
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

* **Client-side variables** (`VITE_*`): Safe to expose to the browser (e.g., Supabase anon key, API URL).
* **Server-side secrets** (`GOOGLE_CLIENT_SECRET`): MUST NOT be prefixed with `VITE_` or exposed to the client. Keep them strictly in your secure backend/server environment.

## Supabase Setup

To enable cloud persistence and file storage:
1. Create a new Supabase project.
2. Run the SQL migrations found in `supabase/migrations/` sequentially in the Supabase SQL Editor:
   - `00001_create_profiles.sql`: Creates the `profiles` table.
   - `00002_create_profile_trigger.sql`: Syncs auth.users to profiles.
   - `00003_create_academic_events.sql`: Creates the `academic_events` table.
   - `00004_harden_rls.sql`: Applies basic Row Level Security.
   - `00005_storage_policies.sql`: Configures the `academic-attachments` bucket and policies.
   - `00006_calendar_connections.sql`: Creates the `calendar_connections` table.
   - `00007_create_calendar_event_sync.sql`: Creates the `calendar_event_sync` table for deduplication tracking.

## Google Cloud Setup

Real Google Calendar testing requires valid Google Cloud configuration:
1. Create a Google Cloud Project.
2. Enable the **Google Calendar API**.
3. Configure the **OAuth consent screen** (Internal or External).
4. Create an **OAuth 2.0 Client ID** (Web application).
5. Add your authorized redirect URI (e.g., `http://localhost:3000/api/oauth/callback`).
6. Place the Client ID, Client Secret, and Redirect URI in your environment variables.

## Demo Credentials

The current implementation utilizes local demo authentication for previewing. **Demo-only credentials**:

**Student:**
`student@classsync.com`
`123456`

**Admin:**
`admin@classsync.com`
`admin123`

## Deployment

To deploy on Vercel:
1. Connect your GitHub repository to Vercel.
2. Set your environment variables in the Vercel dashboard.
3. Deploy.
4. Access your production URL.

Current deployment: `https://classsync-platform.vercel.app/`

## Security Notes

- `.env` must never be committed to version control.
- Secret keys must never be exposed in client-side bundles (e.g., no `VITE_GOOGLE_CLIENT_SECRET`).
- Google refresh tokens and client secrets must remain server-side.
- Row Level Security (RLS) in Supabase should remain enabled.
- Demo credentials are strictly for local testing and are not production-ready security.

## Known Limitations

- Real authentication is currently bypassed in favor of a demo mock login. A full integration requires switching the AuthContext to use `supabase.auth`.
- Backend proxying for the Google OAuth exchange requires an Express/Node server layer or Serverless functions to handle the client secret securely, which goes beyond the current static SPA structure.
