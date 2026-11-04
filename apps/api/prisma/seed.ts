import { PrismaClient, Role, CourseStatus, CourseDifficulty, LessonType, QuestionType, SubmissionStatus, NotificationType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting full EduVerse database seed...');

  // 1. Seed Academic Categories
  const categoriesData = [
    { name: 'Computer Science & Tech', slug: 'computer-science-tech', description: 'Software engineering, algorithms, AI, cloud computing and web development.' },
    { name: 'Business & Entrepreneurship', slug: 'business-entrepreneurship', description: 'Startup growth, project management, finance and market strategy.' },
    { name: 'Health & Medicine', slug: 'health-medicine', description: 'Public health, clinical skills, biotechnology and healthcare informatics.' },
    { name: 'Engineering & Robotics', slug: 'engineering-robotics', description: 'Electrical, mechanical, civil engineering and embedded systems.' },
    { name: 'Natural Sciences & Math', slug: 'natural-sciences-math', description: 'Physics, chemistry, biology, statistics and applied calculus.' },
    { name: 'Languages & Communication', slug: 'languages-communication', description: 'English, Amharic, Oromo, Tigrinya, French and professional writing.' },
    { name: 'Arts & Humanities', slug: 'arts-humanities', description: 'History, philosophy, graphic design, UI/UX and creative media.' },
  ];

  const categories = await Promise.all(
    categoriesData.map((cat) =>
      prisma.courseCategory.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, description: cat.description },
        create: cat,
      })
    )
  );
  console.log(`✅ Seeded ${categories.length} academic categories.`);
  const csCategory = categories[0]!;

  // 2. Seed Institution
  const institution = await prisma.institution.upsert({
    where: { slug: 'aait-ethiopia' },
    update: {
      name: 'Addis Ababa Institute of Technology (AAiT)',
      isActive: true,
      domain: 'aait.edu.et',
      contactEmail: 'contact@aait.edu.et',
      website: 'https://www.aait.edu.et',
    },
    create: {
      name: 'Addis Ababa Institute of Technology (AAiT)',
      slug: 'aait-ethiopia',
      isActive: true,
      domain: 'aait.edu.et',
      contactEmail: 'contact@aait.edu.et',
      website: 'https://www.aait.edu.et',
    },
  });
  console.log(`✅ Seeded Institution: ${institution.name}`);

  // Password hash helper using Argon2id
  const hashPassword = (pw: string) =>
    argon2.hash(pw, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

  const superAdminPassword = await hashPassword('EduVerseAdmin123!');
  const teacherPassword = await hashPassword('EduVerseTeacher123!');
  const studentPassword = await hashPassword('EduVerseStudent123!');

  // 3. Seed Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eduverse.et' },
    update: {
      fullName: 'EduVerse Super Administrator',
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: 'admin@eduverse.et',
      fullName: 'EduVerse Super Administrator',
      passwordHash: superAdminPassword,
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
      profile: {
        create: {
          bio: 'EduVerse Global Platform Super Administrator',
          timezone: 'Africa/Addis_Ababa',
        },
      },
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@eduverse.et' },
    update: {
      fullName: 'Dr. Abebe Kebede',
      role: Role.TEACHER,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: 'teacher@eduverse.et',
      fullName: 'Dr. Abebe Kebede',
      passwordHash: teacherPassword,
      role: Role.TEACHER,
      isEmailVerified: true,
      isActive: true,
      profile: {
        create: {
          bio: 'Senior Lecturer and Full-Stack Systems Architect with 12+ years of experience.',
          phoneNumber: '+251 91 123 4567',
          timezone: 'Africa/Addis_Ababa',
        },
      },
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'student@eduverse.et' },
    update: {
      fullName: 'Almaz Tadesse',
      role: Role.STUDENT,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: 'student@eduverse.et',
      fullName: 'Almaz Tadesse',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      isEmailVerified: true,
      isActive: true,
      profile: {
        create: {
          bio: 'Passionate computer science undergraduate aiming to build scalable educational tools.',
          phoneNumber: '+251 92 987 6543',
          timezone: 'Africa/Addis_Ababa',
        },
      },
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'solomon@eduverse.et' },
    update: {
      fullName: 'Solomon Bekele',
      role: Role.STUDENT,
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: 'solomon@eduverse.et',
      fullName: 'Solomon Bekele',
      passwordHash: studentPassword,
      role: Role.STUDENT,
      isEmailVerified: true,
      isActive: true,
      profile: {
        create: {
          bio: 'Junior Software Engineer & cloud infrastructure enthusiast.',
          timezone: 'Africa/Addis_Ababa',
        },
      },
    },
  });
  console.log(`✅ Seeded Core Users: admin, teacher, student (Almaz), student 2 (Solomon)`);

  // 4. Seed Teacher Course 1: Full-Stack Web Development
  const course1Slug = 'full-stack-web-dev-nextjs-nestjs';
  const course1 = await prisma.course.upsert({
    where: { slug: course1Slug },
    update: {
      title: 'Full-Stack Web Development with Next.js & NestJS',
      description: 'Master production-grade microservices with NestJS, clean architecture with PostgreSQL, and modern React 19 / Next.js 15 frontends tailored for Africa’s digital ecosystem.',
      status: CourseStatus.PUBLISHED,
      difficulty: CourseDifficulty.INTERMEDIATE,
      estimatedHours: 24,
      authorId: teacher.id,
      institutionId: institution.id,
      categoryId: csCategory.id,
      learningObjectives: [
        'Architect modular backend services with NestJS and Prisma ORM',
        'Build high-performance, server-rendered UIs with Next.js 15 App Router',
        'Implement robust JWT authentication, refresh token rotation, and RBAC',
        'Deploy scalable full-stack applications with Docker and PostgreSQL',
      ],
      prerequisites: [
        'Basic familiarity with JavaScript / TypeScript',
        'Understanding of fundamental HTTP methods and relational databases',
      ],
    },
    create: {
      title: 'Full-Stack Web Development with Next.js & NestJS',
      slug: course1Slug,
      description: 'Master production-grade microservices with NestJS, clean architecture with PostgreSQL, and modern React 19 / Next.js 15 frontends tailored for Africa’s digital ecosystem.',
      status: CourseStatus.PUBLISHED,
      difficulty: CourseDifficulty.INTERMEDIATE,
      estimatedHours: 24,
      authorId: teacher.id,
      institutionId: institution.id,
      categoryId: csCategory.id,
      learningObjectives: [
        'Architect modular backend services with NestJS and Prisma ORM',
        'Build high-performance, server-rendered UIs with Next.js 15 App Router',
        'Implement robust JWT authentication, refresh token rotation, and RBAC',
        'Deploy scalable full-stack applications with Docker and PostgreSQL',
      ],
      prerequisites: [
        'Basic familiarity with JavaScript / TypeScript',
        'Understanding of fundamental HTTP methods and relational databases',
      ],
    },
  });

  // Section 1: Foundations
  let sec1 = await prisma.courseSection.findFirst({
    where: { courseId: course1.id, sortOrder: 1 },
  });
  if (!sec1) {
    sec1 = await prisma.courseSection.create({
      data: {
        courseId: course1.id,
        title: 'Architectural Foundations & TypeScript Mastery',
        sortOrder: 1,
      },
    });
  }

  // Lesson 1: NestJS Microservices
  const lesson1Slug = 'nestjs-microservices-architecture';
  let lesson1 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: sec1.id, slug: lesson1Slug } },
  });
  if (!lesson1) {
    lesson1 = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Building Production Microservices with NestJS',
        slug: lesson1Slug,
        content: `### Welcome to NestJS Architecture
NestJS is a progressive Node.js framework for building efficient, reliable and scalable server-side applications.
In this lesson, you will learn:
- Dependency injection containers
- Controllers, services, and repository layers
- Data transfer objects (DTOs) and class-validator
- Clean exception filtering`,
        videoUrl: 'https://www.youtube.com/watch?v=2n3xS89TJMI',
        durationMinutes: 25,
        sortOrder: 1,
        type: LessonType.VIDEO,
        isFreePreview: true,
      },
    });
  }

  // Quiz for Lesson 1
  let quiz1 = await prisma.quiz.findUnique({ where: { lessonId: lesson1.id } });
  if (!quiz1) {
    quiz1 = await prisma.quiz.create({
      data: {
        lessonId: lesson1.id,
        title: 'NestJS Dependency Injection & Architecture Check',
        passingScore: 70,
        timeLimitMinutes: 20,
        attemptLimit: 3,
        questions: {
          create: [
            {
              text: 'Which decorator in NestJS defines a class that can be managed by the IoC container?',
              type: QuestionType.MULTIPLE_CHOICE,
              points: 5,
              sortOrder: 1,
              options: {
                create: [
                  { text: '@Injectable()', isCorrect: true },
                  { text: '@Service()', isCorrect: false },
                  { text: '@Component()', isCorrect: false },
                  { text: '@Module()', isCorrect: false },
                ],
              },
            },
            {
              text: 'Controllers in NestJS should directly execute raw SQL queries instead of delegating to services.',
              type: QuestionType.TRUE_FALSE,
              points: 5,
              sortOrder: 2,
              options: {
                create: [
                  { text: 'True', isCorrect: false },
                  { text: 'False', isCorrect: true },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Lesson 2: Next.js 15 Server Components
  const lesson2Slug = 'nextjs-server-components-app-router';
  let lesson2 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: sec1.id, slug: lesson2Slug } },
  });
  if (!lesson2) {
    lesson2 = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Advanced Server Components & Data Fetching in Next.js 15',
        slug: lesson2Slug,
        content: `### React Server Components in Next.js 15
Server Components allow you to render UI on the server before streaming HTML to the client.
Key concepts:
- Zero client bundle size for backend dependencies
- Streaming with Suspense boundaries
- Server Actions for type-safe mutations`,
        durationMinutes: 30,
        sortOrder: 2,
        type: LessonType.VIDEO,
      },
    });
  }

  // Assignment for Lesson 2
  let assignment1 = await prisma.assignment.findUnique({ where: { lessonId: lesson2.id } });
  if (!assignment1) {
    assignment1 = await prisma.assignment.create({
      data: {
        lessonId: lesson2.id,
        title: 'Deploy a Scalable Multi-Tenant Architecture',
        instructions: `Develop a repository with:
1. NestJS backend modular structure with global validation pipe
2. Next.js 15 App router frontend with React Query caching
3. Clean error handling with informative HTTP exception filters
Submit your GitHub repository link and architecture notes.`,
        maxScore: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });
  }

  // Section 2: Persistence & Testing
  let sec2 = await prisma.courseSection.findFirst({
    where: { courseId: course1.id, sortOrder: 2 },
  });
  if (!sec2) {
    sec2 = await prisma.courseSection.create({
      data: {
        courseId: course1.id,
        title: 'Data Persistence & CI/CD Pipelines',
        sortOrder: 2,
      },
    });
  }

  // Lesson 3: PostgreSQL & Prisma
  const lesson3Slug = 'postgresql-prisma-orm-schema';
  let lesson3 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: sec2.id, slug: lesson3Slug } },
  });
  if (!lesson3) {
    lesson3 = await prisma.lesson.create({
      data: {
        sectionId: sec2.id,
        title: 'PostgreSQL Database Schema Design & Prisma ORM',
        slug: lesson3Slug,
        content: `### Designing Relational Models with Prisma
Prisma provides type-safe database queries.
Best practices:
- UUID primary keys for distributed datasets
- Indexes on foreign keys and frequently queried fields
- Cascade deletes vs SetNull constraints`,
        durationMinutes: 20,
        sortOrder: 1,
        type: LessonType.VIDEO,
      },
    });
  }

  // Lesson 4: End-to-End Testing
  const lesson4Slug = 'end-to-end-integration-testing';
  let lesson4 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: sec2.id, slug: lesson4Slug } },
  });
  if (!lesson4) {
    lesson4 = await prisma.lesson.create({
      data: {
        sectionId: sec2.id,
        title: 'End-to-End Integration Testing & CI/CD Pipelines',
        slug: lesson4Slug,
        content: `### Automated Verification
Learn how to test endpoints using Supertest and Jest, and ensure zero regressions across releases.`,
        durationMinutes: 35,
        sortOrder: 2,
        type: LessonType.TEXT,
      },
    });
  }

  // Course 2: Machine Learning in Python (Completed Track for Student 1 with Certificate)
  const course2Slug = 'intro-machine-learning-python';
  const course2 = await prisma.course.upsert({
    where: { slug: course2Slug },
    update: {
      title: 'Introduction to Machine Learning & Data Science in Python',
      description: 'Comprehensive foundation in statistical modeling, supervised and unsupervised machine learning algorithms using NumPy, Pandas, and Scikit-Learn.',
      status: CourseStatus.PUBLISHED,
      difficulty: CourseDifficulty.BEGINNER,
      estimatedHours: 18,
      authorId: teacher.id,
      institutionId: institution.id,
      categoryId: csCategory.id,
      learningObjectives: [
        'Perform exploratory data analysis and data cleaning in Python',
        'Train and evaluate linear and logistic regression models',
        'Tune hyperparameters with cross-validation and grid search',
      ],
    },
    create: {
      title: 'Introduction to Machine Learning & Data Science in Python',
      slug: course2Slug,
      description: 'Comprehensive foundation in statistical modeling, supervised and unsupervised machine learning algorithms using NumPy, Pandas, and Scikit-Learn.',
      status: CourseStatus.PUBLISHED,
      difficulty: CourseDifficulty.BEGINNER,
      estimatedHours: 18,
      authorId: teacher.id,
      institutionId: institution.id,
      categoryId: csCategory.id,
      learningObjectives: [
        'Perform exploratory data analysis and data cleaning in Python',
        'Train and evaluate linear and logistic regression models',
        'Tune hyperparameters with cross-validation and grid search',
      ],
    },
  });

  // Course 3: Microservices in Docker (Pending Moderation Review)
  const course3Slug = 'microservices-docker-kubernetes';
  await prisma.course.upsert({
    where: { slug: course3Slug },
    update: {
      title: 'Advanced Microservices Architecture with Docker & Kubernetes',
      description: 'Containerization, orchestration, ingress routing, and service mesh management for high-availability enterprise workloads.',
      status: CourseStatus.PENDING_REVIEW,
      difficulty: CourseDifficulty.ADVANCED,
      estimatedHours: 30,
      authorId: teacher.id,
      institutionId: institution.id,
      categoryId: csCategory.id,
    },
    create: {
      title: 'Advanced Microservices Architecture with Docker & Kubernetes',
      slug: course3Slug,
      description: 'Containerization, orchestration, ingress routing, and service mesh management for high-availability enterprise workloads.',
      status: CourseStatus.PENDING_REVIEW,
      difficulty: CourseDifficulty.ADVANCED,
      estimatedHours: 30,
      authorId: teacher.id,
      institutionId: institution.id,
      categoryId: csCategory.id,
    },
  });

  console.log(`✅ Seeded 3 Courses: Full-Stack (Published), ML Python (Published), Microservices (Pending Review)`);

  // 5. Seed Enrollments for Student 1 (Almaz)
  // Enrollment in Course 1: 75% completed (3 of 4 lessons completed)
  const enrollment1 = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student1.id, courseId: course1.id } },
    update: { progressPercentage: 75 },
    create: {
      userId: student1.id,
      courseId: course1.id,
      progressPercentage: 75,
    },
  });

  // Mark Lessons 1, 2, 3 as completed for Student 1
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment1.id, lessonId: lesson1.id } },
    update: { completed: true },
    create: { enrollmentId: enrollment1.id, lessonId: lesson1.id, completed: true },
  });
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment1.id, lessonId: lesson2.id } },
    update: { completed: true },
    create: { enrollmentId: enrollment1.id, lessonId: lesson2.id, completed: true },
  });
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment1.id, lessonId: lesson3.id } },
    update: { completed: true },
    create: { enrollmentId: enrollment1.id, lessonId: lesson3.id, completed: true },
  });

  // Quiz attempt for Student 1 on Quiz 1: Passed (90%)
  const existingAttempt = await prisma.quizAttempt.findFirst({
    where: { enrollmentId: enrollment1.id, quizId: quiz1.id },
  });
  if (!existingAttempt) {
    await prisma.quizAttempt.create({
      data: {
        quizId: quiz1.id,
        enrollmentId: enrollment1.id,
        userId: student1.id,
        score: 90,
        passed: true,
        answers: { q1: 'opt1', q2: 'opt2' },
      },
    });
  }

  // Graded Assignment Submission for Student 1
  const existingSub1 = await prisma.assignmentSubmission.findFirst({
    where: { enrollmentId: enrollment1.id, assignmentId: assignment1.id },
  });
  if (!existingSub1) {
    await prisma.assignmentSubmission.create({
      data: {
        assignmentId: assignment1.id,
        enrollmentId: enrollment1.id,
        userId: student1.id,
        content: 'https://github.com/almaz-tadesse/eduverse-multitenant-prototype\n\nImplemented global NestJS pipes, JWT guards, and Next.js 15 Server Actions.',
        status: SubmissionStatus.GRADED,
        grade: 95,
        feedback: 'Outstanding architecture and clean modularization! Verified with full marks. Keep up the great work.',
        gradedAt: new Date(),
      },
    });
  }

  // Enrollment in Course 2: 100% completed with Certificate!
  const enrollment2 = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student1.id, courseId: course2.id } },
    update: {
      progressPercentage: 100,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId: student1.id,
      courseId: course2.id,
      progressPercentage: 100,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Certificate for Student 1 on Course 2
  const certCode = 'EDU-ETH-2026-CS882';
  await prisma.certificate.upsert({
    where: { verificationCode: certCode },
    update: {
      isRevoked: false,
    },
    create: {
      verificationCode: certCode,
      enrollmentId: enrollment2.id,
      userId: student1.id,
      courseId: course2.id,
      isRevoked: false,
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Seeded Verifiable Certificate: ${certCode}`);

  // 6. Seed Student 2 (Solomon Bekele) with a PENDING submission in Course 1 for Teacher's Grading Queue!
  const enrollmentSolomon = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: course1.id } },
    update: { progressPercentage: 50 },
    create: {
      userId: student2.id,
      courseId: course1.id,
      progressPercentage: 50,
    },
  });

  const existingSubSolomon = await prisma.assignmentSubmission.findFirst({
    where: { enrollmentId: enrollmentSolomon.id, assignmentId: assignment1.id },
  });
  if (!existingSubSolomon) {
    await prisma.assignmentSubmission.create({
      data: {
        assignmentId: assignment1.id,
        enrollmentId: enrollmentSolomon.id,
        userId: student2.id,
        content: 'https://github.com/solomon-bekele/eduverse-project-submission\n\nSubmitted on schedule. I configured Docker Compose for PostgreSQL and implemented role-based authorization guards.',
        status: SubmissionStatus.PENDING,
      },
    });
    console.log(`✅ Seeded Pending Assignment Submission for Solomon (Awaiting Teacher Evaluation)`);
  }

  // 7. Seed Notifications for Student 1
  const studentNotifications = [
    {
      userId: student1.id,
      title: 'Certificate Issued!',
      message: 'Congratulations! You have completed "Introduction to Machine Learning & Data Science in Python". Your digital certificate (EDU-ETH-2026-CS882) is ready to view and download.',
      type: NotificationType.CERTIFICATE,
      isRead: false,
      actionUrl: '/app/certificates',
    },
    {
      userId: student1.id,
      title: 'Assignment Graded: Deploy a Scalable Multi-Tenant Architecture',
      message: 'Dr. Abebe Kebede graded your submission: 95/100 points. "Outstanding architecture and clean modularization!"',
      type: NotificationType.ASSIGNMENT_GRADING,
      isRead: false,
      actionUrl: '/app/assignments',
    },
    {
      userId: student1.id,
      title: 'Quiz Passed: NestJS Dependency Injection',
      message: 'You scored 90% on your knowledge check assessment.',
      type: NotificationType.QUIZ_RESULT,
      isRead: true,
      actionUrl: '/app/quizzes',
    },
    {
      userId: student1.id,
      title: 'Welcome to Full-Stack Web Development',
      message: 'Your enrollment at Addis Ababa Institute of Technology (AAiT) has been confirmed.',
      type: NotificationType.ENROLLMENT,
      isRead: true,
      actionUrl: '/app/courses',
    },
  ];

  for (const notif of studentNotifications) {
    const existing = await prisma.notification.findFirst({
      where: { userId: notif.userId, title: notif.title },
    });
    if (!existing) {
      await prisma.notification.create({ data: notif });
    }
  }
  console.log(`✅ Seeded Notifications for Student 1`);

  // 8. Seed Course Review
  const existingReview = await prisma.review.findUnique({
    where: { courseId_userId: { courseId: course1.id, userId: student1.id } },
  });
  if (!existingReview) {
    await prisma.review.create({
      data: {
        courseId: course1.id,
        userId: student1.id,
        rating: 5,
        comment: 'This curriculum is world-class. The practical real-world architecture examples are exactly what we need in Ethiopia’s expanding software industry.',
      },
    });
    console.log(`✅ Seeded 5-Star Course Review`);
  }

  console.log('🎉 Full EduVerse database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
