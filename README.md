# EduVerse

> **Tagline:** Learn Beyond Boundaries.

EduVerse is a high-performance, secure, and accessible educational SaaS web platform engineered with Next.js App Router, NestJS, TypeScript, and PostgreSQL.

---

## 1. Monorepo Architecture

EduVerse uses **pnpm workspaces** to organize code into modular applications and reusable internal packages:

```
eduverse/
├── apps/
│   ├── web/                     # Next.js App Router (Frontend)
│   └── api/                     # NestJS Core (Backend REST API)
├── packages/
│   ├── shared-types/            # Shared TypeScript types, enums (Role, CourseStatus)
│   ├── shared-validation/       # Shared Zod validation schemas
│   ├── api-client/              # Type-safe API client wrapper
│   ├── typescript-config/       # Base tsconfig configurations
│   └── eslint-config/           # Monorepo linting standards
├── infrastructure/              # docker-compose.yml for local PostgreSQL
├── docs/                        # Complete technical documentation
│   ├── SRS.md                   # Software Requirements Specification
│   ├── DESIGN_SYSTEM.md         # UI/UX Specifications & Color Tokens
│   ├── ARCHITECTURE.md          # Technical System Architecture
│   ├── DATABASE.md              # Database Schema & Relational Models
│   └── API.md                   # REST API Endpoint Documentation
├── pnpm-workspace.yaml          # Monorepo workspace configuration
└── package.json                 # Monorepo root scripts & dev tools
```

---

## 2. Prerequisites

- **Node.js:** `v20+` (Detected: `v24.22.1`)
- **Package Manager:** `pnpm v10+` (Installed: `v12.16.1`)
- **Database:** PostgreSQL 16+ (Local instance, Docker container, or Cloud PostgreSQL like Neon/Supabase)
- **Version Control:** Git

---

## 3. Quick Start (Windows PowerShell)

### Step 1: Install Dependencies
```powershell
pnpm install
```

### Step 2: Configure Environment
Copy `.env.example` files to `.env`:
```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

### Step 3: Run Database
```powershell
# If using Docker Desktop:
docker compose -f infrastructure/docker-compose.yml up -d
```
*(Or point `DATABASE_URL` in `apps/api/.env` to your cloud PostgreSQL database)*

### Step 4: Build Shared Packages
```powershell
pnpm run build
```

### Step 5: Start Development Servers
```powershell
pnpm run dev
```



## 4. Key Monorepo Commands

| Command | Action |
| :--- | :--- |
| `pnpm run build` | Compiles shared packages and applications |
| `pnpm run typecheck` | Executes TypeScript strict type verification across all packages |
| `pnpm run dev` | Starts development servers in parallel |
| `pnpm run clean` | Cleans build artifacts and caches |

---

## 5. Security & Invariant Rules

1. Public self-registration assigns the `STUDENT` role by default.
2. Privileged roles (`TEACHER`, `INSTITUTION_ADMIN`, `SUPER_ADMIN`) require cryptographic tokens or admin invitation.
3. Access tokens expire in 15 minutes; refresh tokens rotate on every use with reuse detection.
4. All course content requires verified active enrollment.
5. Digital certificates are issued strictly upon 100% verified lesson completion.

