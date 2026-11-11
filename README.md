# 🌌 EduVerse — Enterprise Higher & Vocational Learning Platform

[![CI/CD Pipeline](https://github.com/abdellaharegaw616-web/EduVerse/actions/workflows/ci.yml/badge.svg)](https://github.com/abdellaharegaw616-web/EduVerse/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)
![NestJS](https://img.shields.io/badge/NestJS-11.0-e0234e?logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Tests](https://img.shields.io/badge/Tests-222%20Passing-success)

> **Tagline:** *Learn Beyond Boundaries, Anywhere in Ethiopia and Beyond.*

EduVerse is a full-stack, enterprise-grade educational SaaS and Learning Management System (LMS) built with **Next.js 15 (App Router)**, **NestJS 11**, **Prisma ORM 6**, and **PostgreSQL**. Designed with extreme security, accessibility for low-bandwidth 3G connections, and academic rigor in mind.

---

## 🚀 Pre-Seeded Academic Demo Accounts

The database comes pre-seeded with complete coursework, student enrollments, interactive quizzes, assignments, graded evaluations, and verifiable certificates.

| Role | Email | Password | Primary Portal | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin@eduverse.et` | `EduVerseAdmin123!` | `/admin` | Course moderation, user management, audit logs, global settings |
| **Teacher / Instructor** | `teacher@eduverse.et` | `EduVerseTeacher123!` | `/teacher` | Course syllabus authoring, quiz builder, assignment grading queue |
| **Student (Almaz)** | `student@eduverse.et` | `EduVerseStudent123!` | `/app` | 75% completed track, quiz taken, graded assignment, certificate earned |
| **Student (Solomon)** | `solomon@eduverse.et` | `EduVerseStudent123!` | `/app` | Active student with pending assignment submission in grading queue |

---

## 🏛️ Monorepo Architecture

EduVerse is organized using **pnpm workspaces** for strict separation of concerns, zero code duplication, and shared validation logic:

```
eduverse/
├── apps/
│   ├── web/                     # Next.js 15 App Router (Frontend UI, React 19, Tailwind)
│   └── api/                     # NestJS 11 Core REST API (Prisma ORM, Argon2, JWT)
├── packages/
│   ├── shared-types/            # Shared TypeScript contracts, enums & interfaces
│   ├── shared-validation/       # Shared Zod validation schemas across API & Web
│   ├── api-client/              # Type-safe API client wrapper with credentials
│   ├── typescript-config/       # Base tsconfig configurations
│   └── eslint-config/           # Monorepo linting standards
├── infrastructure/              # docker-compose.yml for local PostgreSQL
├── docs/                        # Complete technical specifications & design system
├── .github/workflows/           # GitHub Actions CI pipeline (Typecheck, 222 Tests, Build)
├── pnpm-workspace.yaml          # Workspace declarations
└── package.json                 # Monorepo root scripts & dev tools
```

---

## 🌟 Key Platform Modules & Portals

### 1. 🎓 Student Learning Portal (`/app/*`)
- **Dashboard (`/app/dashboard`):** Real-time learning telemetry, enrolled courses, average completion metrics, and fast-resume links.
- **My Courses (`/app/courses`):** Filter and search active and completed curricula.
- **Learning Progress (`/app/progress`):** Visual progress breakdowns, syllabus completion ratios, and milestone tracking.
- **Recent Lessons (`/app/recent-lessons`):** Chronological playback history of viewed lessons.
- **Assignments (`/app/assignments`):** Deliverable tracker, submission portal (GitHub repos/text), instructor grades, and feedback.
- **Quiz History (`/app/quizzes`):** Knowledge check logs with scores, pass status, and diagnostic breakdowns.
- **Certificates (`/app/certificates`):** Downloadable and cryptographically verifiable digital credentials.
- **Notifications (`/app/notifications`):** Real-time academic alerts for graded coursework, new certificates, course announcements, and enrollments.
- **AI Study Tutor (`/app/ai-tutor`):** Course- and lesson-grounded academic tutor with lesson summaries, plain-language explanations, flashcards, optional English/Amharic hints, and built-in low-bandwidth contextual fallback alongside optional Gemini or OpenAI integration.
- **Study Notebook & Bookmarks (`/app/notes`):** Personal markdown notes and bookmarked lessons synced directly with the Course Learning Player.
- **Student Profile & Settings (`/app/profile`, `/app/settings`):** Profile details, timezone, avatar, and password changes.

### 2. 👨‍🏫 Instructor Studio (`/teacher/*`)
- **Studio Dashboard (`/teacher/dashboard`):** Cohort telemetry, total active students, pending submissions, and course completion funnel.
- **Course Authoring (`/teacher/courses` & `/teacher/courses/create`):** Rich curriculum builder with optional AI course outline drafting, sections, video lessons, and resources.
- **Assessment Builder (`/teacher/courses/[id]/quizzes`):** Multiple-choice quiz builder with AI draft question generation from lesson content.
- **Grading Queue (`/teacher/grading`):** Live review queue with grading inputs (0–100), qualitative instructor feedback, and optional AI feedback drafting.
- **Course Announcements (`/teacher/announcements`):** Publish cohort notices and notify enrolled students automatically.
- **Cohort Analytics (`/teacher/analytics`):** Real-time pass rates, average scores, and enrollment funnels per course.
- **Moderation Workflow:** Submit drafted courses to institutional administrators for quality assurance.

### 3. 🛡️ Super Administrator Portal (`/admin`)
- **Overview:** System-wide metrics across users, active courses, institutions, and submissions.
- **Course Moderation Queue:** Review pending curriculum submissions; approve or reject with mandatory audit reasons.
- **User Administration:** View user directory, update RBAC roles, and suspend/reactivate accounts with audit logging.
- **Content Moderation:** Moderate student course reviews and testimonials.
- **Institution Management:** Onboard and administer academic institutions (e.g. Addis Ababa Institute of Technology).
- **Audit Logs:** Immutable audit trail capturing actor, target resource, timestamp, and metadata.
- **Global Settings:** Platform maintenance mode and system configurations.

### 4. 🌐 Public Discovery & Course Player
- **Homepage (`/`):** Dynamic marketing showcase linking directly to featured tracks.
- **Catalog (`/courses`):** Filter by academic category, difficulty (Beginner, Intermediate, Advanced), and search keywords.
- **Course Detail (`/courses/[slug]`):** Syllabus breakdown, prerequisites, learning outcomes, instructor bio, and 1-click enrollment.
- **Video & Text Lesson Player (`/courses/[slug]/learn`):** Interactive video player, markdown content viewer, interactive quiz runner, assignment submitter, AI Study Tutor, Study Notes & Bookmarking, and Instructor Announcements.
- **Certificate Verification (`/verify/[code]`):** Public verification engine for employers to validate certificate authenticity.

---

## 🛠️ Tech Stack & Highlights

- **Frontend:** Next.js 15.5 App Router, React 19, Tailwind CSS, Lucide Icons, TanStack React Query v5.
- **Backend:** NestJS 11, Prisma ORM 6.19, PostgreSQL 16, Passport JWT, Argon2id password hashing, Helmet, Throttler.
- **Type Safety:** 100% end-to-end typed using monorepo packages `@eduverse/shared-types` and `@eduverse/shared-validation`.
- **Testing:** Jest unit tests with 16 test suites and **222 passing tests**.
- **Security:** HttpOnly cookies for JWT access and refresh tokens, refresh token rotation with reuse detection, Role-Based Access Control (RBAC).

---

## ⚡ Quick Start & Development

### 1. Prerequisites
- **Node.js:** `v20+` (Recommended `v22+`)
- **pnpm:** `v9+` or `v10+`
- **PostgreSQL:** Running locally on port 5432 or cloud URL (e.g., Supabase / Neon)

### 2. Installation
```powershell
# Clone the repository
git clone https://github.com/abdellaharegaw616-web/EduVerse.git
cd EduVerse

# Install monorepo dependencies
pnpm install
```

### 3. Environment Configuration
Create `.env` files from templates:
```powershell
# API environment
Copy-Item apps/api/.env.example apps/api/.env

# Web frontend environment
Copy-Item apps/web/.env.example apps/web/.env.local
```

Ensure `DATABASE_URL` in `apps/api/.env` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:Abdu54321@localhost:5432/eduverse_db?schema=public"
PORT=4000
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="eduverse-development-secret-key-change-in-production-min-32-chars"
JWT_REFRESH_SECRET="eduverse-development-refresh-secret-key-change-in-production-min-32-chars"
```

### 4. Database Setup & Seeding
```powershell
# Generate Prisma Client & Push schema to DB
pnpm --filter @eduverse/api prisma:generate
pnpm --filter @eduverse/api exec prisma db push

# Seed all demo courses, users, quizzes, assignments & certificates
pnpm --filter @eduverse/api prisma:seed
```

### 5. Running Development Servers
You can run both apps in parallel or separately:

**Option A: Run both simultaneously (Parallel)**
```powershell
pnpm run dev
```

**Option B: Run separately in dedicated terminals**
```powershell
# Terminal 1: Backend API (NestJS on http://localhost:4000)
pnpm run dev:api

# Terminal 2: Frontend (Next.js on http://localhost:3000)
pnpm run dev:web
```

- **Frontend Application:** `http://localhost:3000`
- **Backend REST API:** `http://localhost:4000/api/v1`
- **Interactive Swagger API Docs:** `http://localhost:4000/api/docs`

---

## 🧪 Testing & Verification

```powershell
# Run full workspace TypeScript verification (0 errors)
pnpm run typecheck

# Run backend unit test suite (16 suites, 222 tests)
pnpm --filter @eduverse/api test

# Build production bundles
pnpm run build
```

---

## 📄 License & Attribution

Designed and developed for high-impact higher education in Ethiopia and beyond. All rights reserved.
