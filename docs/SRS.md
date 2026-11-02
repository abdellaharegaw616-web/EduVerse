# EduVerse — Software Requirements Specification (SRS)

**Project Name:** EduVerse  
**Tagline:** *Learn Beyond Boundaries*  
**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Architecture Lead:** Senior Software Architect & Technical Lead  

---

## 1. Product Vision

EduVerse is a secure, accessible, and high-performance educational SaaS platform designed to eliminate physical, institutional, and geographical barriers to quality learning. 

Our mission is to empower individual learners, instructors, and academic institutions with a modern learning management system (LMS) that:
- Loads rapidly and functions reliably even over low-bandwidth or unstable network connections.
- Organizes structured, distraction-free educational curricula.
- Issues tamper-proof, publicly verifiable completion credentials.
- Scales gracefully from independent educators to multi-department academic institutions.

---

## 2. Problem Statement

Contemporary learning platforms present critical hurdles for modern digital education:
1. **Bloat and Heavy Infrastructure:** Legacy platforms (e.g., Moodle, Blackboard) are resource-intensive, complex to configure, and sluggish on mobile devices and slow internet connections.
2. **Fragmented Learning Experiences:** Students are often forced to juggle scattered Telegram/WhatsApp channels, unorganized PDF drives, and untracked video playlists with no structured progress measurement.
3. **Lack of Accessible Multi-Tenancy:** Schools, colleges, and training academies lack affordable, turn-key software to manage their own instructors, curricula, and student cohorts without deploying and maintaining dedicated servers.
4. **Unreliable Credentialing:** Traditional physical certificates or unverified digital images are prone to forgery and cannot be instantly verified by employers or academic bodies.

---

## 3. Ethiopian Education Realities Addressed by EduVerse

Deploying software in emerging digital landscapes like Ethiopia requires deliberate, reality-based architectural decisions:

| Ground Reality in Ethiopia | Educational Consequence | EduVerse Architectural Solution |
| :--- | :--- | :--- |
| **Expensive & Unstable Bandwidth** | Heavy single-page apps fail to load; students burn through costly mobile data quotas. | Lightweight Next.js payload, aggressive HTTP caching, mobile-first design, and markdown-first lessons to minimize data consumption. |
| **Intermittent Network Dropouts** | Students lose exam states or lesson positions when mobile signals disconnect. | Atomic progress tracking; lesson completion states are recorded immediately per action so progress is never lost. |
| **Mobile-First & Shared Devices** | Most students access the internet via budget Android smartphones or public lab computers. | Fully responsive mobile layouts, strict session timeouts, and secure cookie expiration policies suited for shared workstations. |
| **Credential Fraud** | Paper certificates are frequently altered or falsified; manual verification takes weeks. | Cryptographically unique, tamper-proof digital certificates featuring a public verification link (`/verify/:code`). |
| **Institutional Digital Divide** | Local academies and regional colleges cannot afford dedicated DevOps teams. | Centralized multi-tenant SaaS architecture where institutions get isolated virtual environments out-of-the-box. |

---

## 4. Target Customers & Personas

- **Students:** Undergraduates, high school learners, and professionals seeking structured, certified skill building.
- **Teachers:** Faculty affiliated with schools and universities needing an intuitive curriculum builder and class progress visibility.
- **Independent Instructors:** Freelance educators and coaches publishing public courses to independent audiences.
- **Educational Institutions:** Universities, colleges, and academies needing a private branded tenant to manage faculty and student cohorts.

---

## 5. Functional Requirements (FR)

### Module 1: Authentication & Identity Management (FR-AUTH)
- **FR-AUTH-1 (Self-Registration):** Any public visitor can create an account using an email, full name, and password. The system assigns the `STUDENT` role automatically.
- **FR-AUTH-2 (Password Security):** Passwords must be hashed using **Argon2id**. Plaintext passwords must never be stored, logged, or returned in API responses.
- **FR-AUTH-3 (Session Management):** Authentication must use short-lived JWT access tokens (15 minutes) paired with rotating refresh tokens (7 days) delivered via `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
- **FR-AUTH-4 (Session Revocation):** Logging out must invalidate the refresh token record in the database immediately.
- **FR-AUTH-5 (Privileged Onboarding):** Privileged roles (`SUPER_ADMIN`, `INSTITUTION_ADMIN`, `TEACHER`, `INDEPENDENT_INSTRUCTOR`) cannot be self-selected. They must be provisioned via cryptographic invitation tokens or direct administrator action.

### Module 2: Multi-Tenancy & Institutional Management (FR-INST)
- **FR-INST-1 (Tenant Creation):** `SUPER_ADMIN` can create institutions with a unique name, slug, contact details, and status.
- **FR-INST-2 (Faculty Invitations):** `INSTITUTION_ADMIN` can generate single-use email invitation links to onboard verified `TEACHER` accounts into their institution.
- **FR-INST-3 (Tenant Data Isolation):** An institution administrator or teacher can only query or modify data belonging strictly to their assigned `institutionId`.

### Module 3: Course & Curriculum Management (FR-COURSE)
- **FR-COURSE-1 (Course Authoring):** Authorized educators (`TEACHER`, `INDEPENDENT_INSTRUCTOR`, `SUPER_ADMIN`) can create and maintain courses.
- **FR-COURSE-2 (Curriculum Hierarchy):** Courses follow a three-tier structure: $\text{Course} \rightarrow \text{Modules} \rightarrow \text{Lessons}$.
- **FR-COURSE-3 (Lesson Content):** Lessons support rich text/Markdown, video streaming links (YouTube/Vimeo embed URLs), downloadable resource links, and estimated completion duration.
- **FR-COURSE-4 (Publishing State Machine):** Courses exist in three discrete states: `DRAFT`, `PUBLISHED`, or `ARCHIVED`. Only `PUBLISHED` courses appear in catalogs.
- **FR-COURSE-5 (Ownership Guard):** Teachers can only update or delete courses where `course.authorId == current_user.id`.

### Module 4: Enrollment & Progress Checkpointing (FR-ENROLL)
- **FR-ENROLL-1 (Enrollment):** Authenticated students can enroll in any published public course or assigned institutional course with a single action. Duplicate enrollments are rejected.
- **FR-ENROLL-2 (Access Control):** Non-enrolled users and unauthorized roles are blocked from accessing lesson content (`403 Forbidden`).
- **FR-ENROLL-3 (Atomic Checkpoints):** Students mark lessons as completed. Each completion is stored atomically with a timestamp.
- **FR-ENROLL-4 (Progress Calculation):** Overall course completion percentage is computed deterministically:
  $$\text{Progress} = \left(\frac{\text{Completed Lessons Count}}{\text{Total Published Lessons Count}}\right) \times 100$$

### Module 5: Verifiable Digital Certification (FR-CERT)
- **FR-CERT-1 (Automatic Issuance):** A certificate is automatically generated if and only if a student's course progress reaches **100%**.
- **FR-CERT-2 (Tamper-Resistant ID):** Each certificate is assigned an unguessable UUID verification code.
- **FR-CERT-3 (Public Verification):** A public web route (`/verify/:code`) allows anyone to view the recipient's name, course title, completion date, and issuing educator/institution.

### Module 6: Platform Administration & Moderation (FR-ADMIN)
- **FR-ADMIN-1 (User Management):** `SUPER_ADMIN` can inspect all user accounts, deactivate abusive users, or reassign institutional roles.
- **FR-ADMIN-2 (Catalog Moderation):** `SUPER_ADMIN` can archive courses that violate content standards.

---

## 6. Non-Functional Requirements (NFR)

| Quality Attribute | Requirement Specification | Metric / Target |
| :--- | :--- | :--- |
| **Performance** | API response latency under standard load ($100$ concurrent users). | $p95 < 200\text{ ms}$ for database queries; $< 80\text{ ms}$ for cached reads. |
| **Bandwidth Efficiency** | Initial frontend bundle size on mobile web. | First Contentful Paint (FCP) $< 1.8\text{ s}$ over emulated 3G network. |
| **Security** | Zero plaintext secrets; encrypted sessions; CSRF & XSS hardening. | Argon2id password hashing; HTTP-only SameSite cookies; Helmet headers; OWASP Top 10 compliance. |
| **Data Integrity** | Transaction safety for enrollment, completion, and certification workflows. | ACID transactional boundaries via Prisma & PostgreSQL. Zero duplicate enrollments or duplicate certificates. |
| **Scalability** | Stateless application server tier allowing horizontal replication. | Stateless NestJS API; token revocation tracking centralized in PostgreSQL. |
| **Maintainability** | Monorepo structure, 100% strict TypeScript, end-to-end type sharing. | Zero TypeScript compiler errors (`tsc --noEmit`); shared DTO validation across tiers. |
| **Accessibility (a11y)**| Usability for students with diverse visual and input requirements. | WCAG 2.1 Level AA compliance across student-facing interfaces. |

---

## 7. Role and Permission Matrix (RBAC)

| Resource & Operation | GUEST | STUDENT | TEACHER | INDEP_INSTRUCTOR | INSTITUTION_ADMIN | SUPER_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Browse public course catalog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verify certificate via code | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register an account (self) | ✅ (as Student) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Enroll in published course | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Access enrolled lesson content | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mark lesson as complete | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create course (in institution)| ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Create course (public/indep) | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Edit own course curriculum | ❌ | ❌ | ✅ (own only) | ✅ (own only) | ❌ | ✅ |
| View student roster for course| ❌ | ❌ | ✅ (own only) | ✅ (own only) | ✅ (org only) | ✅ |
| Invite teachers to institution| ❌ | ❌ | ❌ | ❌ | ✅ (own org) | ✅ |
| Manage institution settings | ❌ | ❌ | ❌ | ❌ | ✅ (own org) | ✅ |
| Create new institution | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suspend users / platform audit | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 8. Business Rules

1. Public registration creates `STUDENT` accounts only.
2. Privileged roles (`TEACHER`, `INDEPENDENT_INSTRUCTOR`, `INSTITUTION_ADMIN`, `SUPER_ADMIN`) require authorized invitations or administrative action.
3. Teachers can view and manage only their authorized courses.
4. Institution administrators can access only data belonging to their institution.
5. Students can access only lesson content for courses in which they have an active enrollment.
6. Certificates are issued automatically upon verified 100% completion of course lessons and cannot be fabricated manually.
7. Payment integrations and monetary transactions are strictly excluded from MVP.
8. AI and LLM features are deferred to future phases.

---

## 9. Definition of Done (DoD)

A development phase or individual feature task is considered **Done** only when:
1. **Type Safety:** Strict TypeScript compilation passes with zero errors (`tsc --noEmit` exits with code 0).
2. **Linting & Code Standards:** ESLint and Prettier pass with zero warnings or errors.
3. **Automated Testing:** Business logic has automated unit and integration tests that execute and pass cleanly.
4. **Security Verification:** No secrets committed; guards and RBAC active; input sanitized.
5. **Architectural Integrity:** Follows folder structure; no circular package dependencies.
6. **Error Handling & Observability:** Standard HTTP status codes with sanitized error messages.
7. **Documentation:** Documentation updated when architecture or behavior changes.
8. **Real Verification:** Verified against real API calls and database state.

