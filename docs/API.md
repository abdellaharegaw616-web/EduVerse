# EduVerse — REST API Specifications

**Base URL:** `/api`  
**Authentication Scheme:** Dual Token (15m JWT Access Token + 7d Rotating Refresh Token via `HttpOnly` Cookies)  
**Standard Response Format:** JSON  
**Error Standard:** RFC 7807 Problem Details  

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "student@institution.edu.et",
    "password": "SecurePassword123!",
    "fullName": "Abebe Bekele"
  }
  ```
- **Response `201 Created`:** Sets `access_token` and `refresh_token` cookies.
  ```json
  {
    "user": {
      "id": "c1a1f092-d6ef-4663-8bb9-123456789abc",
      "email": "student@institution.edu.et",
      "fullName": "Abebe Bekele",
      "role": "STUDENT"
    }
  }
  ```

### 1.2 `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "student@institution.edu.et",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:** Sets `access_token` and `refresh_token` cookies.

### 1.3 `POST /api/auth/refresh`
- **Access:** Public (Requires `refresh_token` cookie)
- **Response `200 OK`:** Replaces `access_token` and `refresh_token` cookies with freshly rotated pair.

### 1.4 `POST /api/auth/logout`
- **Access:** 🔒 Authenticated
- **Response `200 OK`:** Invalidates session in database and clears cookies.

---

## 2. Course Endpoints (`/api/courses`)

### 2.1 `GET /api/courses`
- **Access:** Public
- **Query Params:** `category`, `search`, `page`, `limit`
- **Response `200 OK`:** Paginated published course metadata.

### 2.2 `GET /api/courses/:slug`
- **Access:** Public
- **Response `200 OK`:** Public course summary, modules, and lesson titles (lesson body is hidden).

### 2.3 `POST /api/courses/:id/enroll`
- **Access:** 🔒 Authenticated (`STUDENT`)
- **Response `201 Created`:** Enrollment record created. Returns `enrollmentId`.

---

## 3. Curriculum & Lessons (`/api/lessons`)

### 3.1 `GET /api/courses/:slug/lessons/:lessonId`
- **Access:** 🔒 Enrolled Student or Course Author
- **Response `200 OK`:** Full lesson content including sanitized markdown and video URL.
- **Response `403 Forbidden`:** If student is not enrolled.

### 3.2 `POST /api/lessons/:lessonId/complete`
- **Access:** 🔒 Enrolled Student
- **Response `200 OK`:**
  ```json
  {
    "lessonId": "b2c3d4e5-f6a7-8901-bcde-234567890123",
    "completed": true,
    "courseProgressPercentage": 60.0,
    "isCourseCompleted": false
  }
  ```

---

## 4. Certificates (`/api/certificates`)

### 4.1 `GET /api/certificates/verify/:code`
- **Access:** Public
- **Response `200 OK`:**
  ```json
  {
    "verificationCode": "EV-2026-A89F4B",
    "recipientName": "Abebe Bekele",
    "courseTitle": "Full-Stack Web Architectures with Next.js & NestJS",
    "issuedAt": "2026-11-02T11:45:00.000Z",
    "institution": "Addis Ababa Institute of Technology",
    "isAuthentic": true
  }
  ```

