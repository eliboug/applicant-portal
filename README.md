# Elmseed Applicant Portal

A modern applicant portal for managing scholarship/fellowship applications. Built with React, TypeScript, Vite, and Supabase.

## Features

### Applicant Experience
- **Account creation & authentication** - Email/password signup with email confirmation
- **Application dashboard** - View status, uploaded documents, and timeline
- **Multi-step application form** - Personal info, academic background, essays, document uploads
- **Document management** - PDF uploads with replace/remove functionality
- **Status tracking** - Visual timeline showing application progress

### Admin/Reviewer Experience
- **Admin dashboard** - Overview metrics and filterable application list
- **Application review** - Split-panel view with applicant info and admin controls
- **Status management** - Update application status with confirmation
- **Document viewing** - Download applicant documents via signed URLs
- **Status history** - Immutable audit log of all status changes

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Routing:** React Router v7
- **Icons:** Lucide React
- **Styling:** CSS Modules with design tokens

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Install Dependencies

```bash
cd applicant-portal
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Go to **Storage** and create a bucket named `application-documents` (set to private)
4. Add storage policies as described in the schema file comments

### 3. Configure Environment

Copy the example environment file and add your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your Supabase dashboard under **Settings > API**.

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── components/
│   ├── layout/          # Header, Layout, ProtectedRoute
│   └── ui/              # Button, Input, Card, StatusPill
├── contexts/
│   └── AuthContext.tsx  # Authentication state management
├── lib/
│   └── supabase.ts      # Supabase client configuration
├── pages/
│   ├── admin/           # AdminDashboard, ApplicationReview
│   ├── applicant/       # ApplicantDashboard, ApplicationForm
│   └── auth/            # LoginPage, SignupPage
├── styles/
│   ├── design-tokens.ts # Color, typography, spacing tokens
│   └── global.css       # Global styles and CSS variables
├── types/
│   └── database.ts      # TypeScript types for database schema
└── App.tsx              # Main app with routing
```

## Database Schema

See `supabase/schema.sql` for the complete schema including:

- **profiles** - User profiles with roles (applicant, reviewer, admin)
- **applications** - Application records with status and form data
- **application_documents** - Uploaded document metadata
- **application_status_history** - Immutable status change audit log
- **reviewer_assignments** - Reviewer-to-application assignments

Row Level Security (RLS) policies enforce access control at the database level.

## User Roles

| Role | Permissions |
|------|-------------|
| **Applicant** | Create/view own applications, upload documents, view status |
| **Reviewer** | View assigned applications, update status |
| **Admin** | Full access to all applications and users |

## Design System

The portal uses a restrained, academic design language:

- **Colors:** Dark green primary (#0F2D1C), mid green accents (#1F6B3F), off-white backgrounds
- **Typography:** Halant font family (serif)
- **Components:** Minimal borders, subtle shadows, generous spacing

See `src/styles/design-tokens.ts` for the complete token definitions.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

Private - Elmseed Applications
