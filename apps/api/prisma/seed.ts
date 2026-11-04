import { PrismaClient, Role, CourseStatus, CourseDifficulty, LessonType, QuestionType, SubmissionStatus, NotificationType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive EduVerse database seed for ALL roles & users...');

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

  // 3. Seed Core Users
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

  // 4. Seed Course 1: Full-Stack Web Development (Published)
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

  // Course 1 - Section 1
  let c1Sec1 = await prisma.courseSection.findFirst({
    where: { courseId: course1.id, sortOrder: 1 },
  });
  if (!c1Sec1) {
    c1Sec1 = await prisma.courseSection.create({
      data: {
        courseId: course1.id,
        title: 'Architectural Foundations & TypeScript Mastery',
        sortOrder: 1,
      },
    });
  }

  // Course 1 - Lesson 1 (Video + Quiz)
  const c1L1Slug = 'nestjs-microservices-architecture';
  let c1L1 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: c1Sec1.id, slug: c1L1Slug } },
  });
  if (!c1L1) {
    c1L1 = await prisma.lesson.create({
      data: {
        sectionId: c1Sec1.id,
        title: 'Building Production Microservices with NestJS',
        slug: c1L1Slug,
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

  // Quiz for Course 1 Lesson 1
  let c1Quiz1 = await prisma.quiz.findUnique({ where: { lessonId: c1L1.id } });
  if (!c1Quiz1) {
    c1Quiz1 = await prisma.quiz.create({
      data: {
        lessonId: c1L1.id,
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

  // Course 1 - Lesson 2 (Video + Assignment)
  const c1L2Slug = 'nextjs-server-components-app-router';
  let c1L2 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: c1Sec1.id, slug: c1L2Slug } },
  });
  if (!c1L2) {
    c1L2 = await prisma.lesson.create({
      data: {
        sectionId: c1Sec1.id,
        title: 'Advanced Server Components & Data Fetching in Next.js 15',
        slug: c1L2Slug,
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

  // Assignment for Course 1 Lesson 2
  let c1Assignment1 = await prisma.assignment.findUnique({ where: { lessonId: c1L2.id } });
  if (!c1Assignment1) {
    c1Assignment1 = await prisma.assignment.create({
      data: {
        lessonId: c1L2.id,
        title: 'Deploy a Scalable Multi-Tenant Architecture',
        instructions: `Develop a repository with:
1. NestJS backend modular structure with global validation pipe
2. Next.js 15 App router frontend with React Query caching
3. Clean error handling with informative HTTP exception filters
Submit your GitHub repository link and architecture notes.`,
        maxScore: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Course 1 - Section 2
  let c1Sec2 = await prisma.courseSection.findFirst({
    where: { courseId: course1.id, sortOrder: 2 },
  });
  if (!c1Sec2) {
    c1Sec2 = await prisma.courseSection.create({
      data: {
        courseId: course1.id,
        title: 'Data Persistence & CI/CD Pipelines',
        sortOrder: 2,
      },
    });
  }

  // Course 1 - Lesson 3
  const c1L3Slug = 'postgresql-prisma-orm-schema';
  let c1L3 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: c1Sec2.id, slug: c1L3Slug } },
  });
  if (!c1L3) {
    c1L3 = await prisma.lesson.create({
      data: {
        sectionId: c1Sec2.id,
        title: 'PostgreSQL Database Schema Design & Prisma ORM',
        slug: c1L3Slug,
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

  // Course 1 - Lesson 4
  const c1L4Slug = 'end-to-end-integration-testing';
  let c1L4 = await prisma.lesson.findUnique({
    where: { sectionId_slug: { sectionId: c1Sec2.id, slug: c1L4Slug } },
  });
  if (!c1L4) {
    c1L4 = await prisma.lesson.create({
      data: {
        sectionId: c1Sec2.id,
        title: 'End-to-End Integration Testing & CI/CD Pipelines',
        slug: c1L4Slug,
        content: `### Automated Verification
Learn how to test endpoints using Supertest and Jest, and ensure zero regressions across releases.`,
        durationMinutes: 35,
        sortOrder: 2,
        type: LessonType.TEXT,
      },
    });
  }

  // 5. Seed Course 2: Machine Learning in Python (Published)
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

  // Course 2 - Section 1
  let c2Sec1 = await prisma.courseSection.findFirst({
    where: { courseId: course2.id, sortOrder: 1 },
  });
  if (!c2Sec1) {
    c2Sec1 = await prisma.courseSection.create({
      data: {
        courseId: course2.id,
        title: 'Supervised Learning Fundamentals & Data Preprocessing',
        sortOrder: 1,
      },
    });
  }

  // Course 2 - Lesson 1
  let c2L1 = await prisma.lesson.findFirst({
    where: { sectionId: c2Sec1.id, slug: 'data-cleaning-pandas-numpy' },
  });
  if (!c2L1) {
    c2L1 = await prisma.lesson.create({
      data: {
        sectionId: c2Sec1.id,
        title: 'Exploratory Data Analysis with Pandas & NumPy',
        slug: 'data-cleaning-pandas-numpy',
        content: `Learn feature scaling, handling null values, and encoding categorical variables.`,
        durationMinutes: 20,
        sortOrder: 1,
        type: LessonType.VIDEO,
      },
    });
  }

  // Course 2 - Lesson 2 (Quiz attached)
  let c2L2 = await prisma.lesson.findFirst({
    where: { sectionId: c2Sec1.id, slug: 'supervised-regression-classification' },
  });
  if (!c2L2) {
    c2L2 = await prisma.lesson.create({
      data: {
        sectionId: c2Sec1.id,
        title: 'Supervised Learning: Linear & Logistic Regression',
        slug: 'supervised-regression-classification',
        content: `Master ordinary least squares regression and logistic sigmoid curves.`,
        durationMinutes: 30,
        sortOrder: 2,
        type: LessonType.VIDEO,
      },
    });
  }

  // Course 2 Quiz
  let c2Quiz = await prisma.quiz.findUnique({ where: { lessonId: c2L2.id } });
  if (!c2Quiz) {
    c2Quiz = await prisma.quiz.create({
      data: {
        lessonId: c2L2.id,
        title: 'Machine Learning Classification Diagnostics',
        passingScore: 70,
        questions: {
          create: [
            {
              text: 'Which metric is most resilient when evaluating highly imbalanced classification datasets?',
              type: QuestionType.MULTIPLE_CHOICE,
              points: 10,
              options: {
                create: [
                  { text: 'F1-Score / Area Under ROC Curve', isCorrect: true },
                  { text: 'Simple Accuracy', isCorrect: false },
                  { text: 'Mean Squared Error', isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Course 2 - Section 2
  let c2Sec2 = await prisma.courseSection.findFirst({
    where: { courseId: course2.id, sortOrder: 2 },
  });
  if (!c2Sec2) {
    c2Sec2 = await prisma.courseSection.create({
      data: {
        courseId: course2.id,
        title: 'Model Evaluation & Production Deployment',
        sortOrder: 2,
      },
    });
  }

  // Course 2 - Lesson 3 (Assignment attached)
  let c2L3 = await prisma.lesson.findFirst({
    where: { sectionId: c2Sec2.id, slug: 'hyperparameter-tuning-cross-val' },
  });
  if (!c2L3) {
    c2L3 = await prisma.lesson.create({
      data: {
        sectionId: c2Sec2.id,
        title: 'Cross-Validation & Hyperparameter Optimization',
        slug: 'hyperparameter-tuning-cross-val',
        content: `Implement K-Fold cross validation and GridSearchCV pipelines.`,
        durationMinutes: 25,
        sortOrder: 1,
        type: LessonType.VIDEO,
      },
    });
  }

  let c2Assignment = await prisma.assignment.findUnique({ where: { lessonId: c2L3.id } });
  if (!c2Assignment) {
    c2Assignment = await prisma.assignment.create({
      data: {
        lessonId: c2L3.id,
        title: 'Predicting Academic Attrition with Scikit-Learn',
        instructions: 'Train an ensemble random forest classifier to predict student retention with >85% precision.',
        maxScore: 100,
      },
    });
  }

  // Course 2 - Lesson 4
  let c2L4 = await prisma.lesson.findFirst({
    where: { sectionId: c2Sec2.id, slug: 'onnx-production-inference' },
  });
  if (!c2L4) {
    c2L4 = await prisma.lesson.create({
      data: {
        sectionId: c2Sec2.id,
        title: 'Exporting Models with ONNX for Production Inference',
        slug: 'onnx-production-inference',
        content: `Export trained scikit-learn pipelines into ONNX runtime format.`,
        durationMinutes: 20,
        sortOrder: 2,
        type: LessonType.TEXT,
      },
    });
  }

  // 6. Seed Course 3: Microservices in Docker (Pending Review)
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

  console.log(`✅ Seeded 3 Courses with Complete Sections, Lessons, Quizzes & Assignments.`);

  // 7. Seed Learning Activity for ALL Users in Database
  // Fetch every registered user so ANY logged-in account has complete, functional pages!
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
  });

  for (const u of allUsers) {
    // A. Course 1 Enrollment: 75% progress (In Progress)
    const enr1 = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: u.id, courseId: course1.id } },
      update: { progressPercentage: 75 },
      create: {
        userId: u.id,
        courseId: course1.id,
        progressPercentage: 75,
      },
    });

    // Mark Lessons 1, 2, 3 completed for User
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enr1.id, lessonId: c1L1.id } },
      update: { completed: true },
      create: { enrollmentId: enr1.id, lessonId: c1L1.id, completed: true },
    });
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enr1.id, lessonId: c1L2.id } },
      update: { completed: true },
      create: { enrollmentId: enr1.id, lessonId: c1L2.id, completed: true },
    });
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enr1.id, lessonId: c1L3.id } },
      update: { completed: true },
      create: { enrollmentId: enr1.id, lessonId: c1L3.id, completed: true },
    });

    // Quiz Attempt for Course 1
    const existingQ1 = await prisma.quizAttempt.findFirst({
      where: { enrollmentId: enr1.id, quizId: c1Quiz1.id },
    });
    if (!existingQ1) {
      await prisma.quizAttempt.create({
        data: {
          quizId: c1Quiz1.id,
          enrollmentId: enr1.id,
          userId: u.id,
          score: 90,
          passed: true,
          answers: { q1: 'opt1', q2: 'opt2' },
        },
      });
    }

    // Graded Assignment Submission for Course 1
    const existingSub1 = await prisma.assignmentSubmission.findFirst({
      where: { enrollmentId: enr1.id, assignmentId: c1Assignment1.id },
    });
    if (!existingSub1) {
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: c1Assignment1.id,
          enrollmentId: enr1.id,
          userId: u.id,
          content: `https://github.com/eduverse-learners/${u.email.split('@')[0]}-multitenant-prototype\n\nModular NestJS architecture with global validation pipes and Next.js 15 App router.`,
          status: SubmissionStatus.GRADED,
          grade: 95,
          feedback: 'Outstanding architecture and clean modularization! Verified with full marks.',
          gradedAt: new Date(),
        },
      });
    }

    // B. Course 2 Enrollment: 100% progress (Completed) with Verifiable Certificate
    const enr2 = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: u.id, courseId: course2.id } },
      update: {
        progressPercentage: 100,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: u.id,
        courseId: course2.id,
        progressPercentage: 100,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // Mark all Course 2 lessons completed
    for (const l of [c2L1, c2L2, c2L3, c2L4]) {
      await prisma.lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId: enr2.id, lessonId: l.id } },
        update: { completed: true },
        create: { enrollmentId: enr2.id, lessonId: l.id, completed: true },
      });
    }

    // Certificate
    const certCode = `EDU-ETH-2026-${u.role.substring(0, 3)}-${u.id.substring(0, 6).toUpperCase()}`;
    await prisma.certificate.upsert({
      where: { enrollmentId: enr2.id },
      update: {
        verificationCode: certCode,
        isRevoked: false,
      },
      create: {
        verificationCode: certCode,
        enrollmentId: enr2.id,
        userId: u.id,
        courseId: course2.id,
        isRevoked: false,
        issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // Notifications
    const notifs = [
      {
        userId: u.id,
        title: 'Certificate Issued!',
        message: `Congratulations ${u.fullName}! You have completed "Introduction to Machine Learning in Python". Your certificate (${certCode}) is ready to view and download.`,
        type: NotificationType.CERTIFICATE,
        isRead: false,
        actionUrl: '/app/certificates',
      },
      {
        userId: u.id,
        title: 'Assignment Graded: Deploy a Scalable Multi-Tenant Architecture',
        message: 'Your submission was evaluated: 95/100 points. "Outstanding architecture and clean modularization!"',
        type: NotificationType.ASSIGNMENT_GRADING,
        isRead: false,
        actionUrl: '/app/assignments',
      },
      {
        userId: u.id,
        title: 'Quiz Passed: NestJS Dependency Injection',
        message: 'You scored 90% on your knowledge check assessment.',
        type: NotificationType.QUIZ_RESULT,
        isRead: true,
        actionUrl: '/app/quizzes',
      },
      {
        userId: u.id,
        title: 'Welcome to Full-Stack Web Development',
        message: 'Your enrollment at Addis Ababa Institute of Technology (AAiT) has been confirmed.',
        type: NotificationType.ENROLLMENT,
        isRead: true,
        actionUrl: '/app/courses',
      },
    ];

    for (const n of notifs) {
      const exists = await prisma.notification.findFirst({
        where: { userId: n.userId, title: n.title },
      });
      if (!exists) {
        await prisma.notification.create({ data: n });
      }
    }
  }
  console.log(`✅ Seeded Full Learning Activity, Progress, Quizzes & Certificates for ALL ${allUsers.length} Users!`);

  // 8. Seed Solomon's PENDING submission so the Teacher Grading Queue is active
  const enrSolomon = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: student2.id, courseId: course1.id } },
  });
  if (enrSolomon) {
    const existingPending = await prisma.assignmentSubmission.findFirst({
      where: { enrollmentId: enrSolomon.id, assignmentId: c1Assignment1.id, status: SubmissionStatus.PENDING },
    });
    if (!existingPending) {
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: c1Assignment1.id,
          enrollmentId: enrSolomon.id,
          userId: student2.id,
          content: 'https://github.com/solomon-bekele/eduverse-project-submission\n\nSubmitted on schedule. Configured Docker Compose for PostgreSQL and implemented role-based authorization guards.',
          status: SubmissionStatus.PENDING,
        },
      });
    }
  }

  // 9. Seed 5-Star Course Review
  const review = await prisma.review.findUnique({
    where: { courseId_userId: { courseId: course1.id, userId: student1.id } },
  });
  if (!review) {
    await prisma.review.create({
      data: {
        courseId: course1.id,
        userId: student1.id,
        rating: 5,
        comment: 'This curriculum is world-class. The practical real-world architecture examples are exactly what we need in Ethiopia’s expanding software industry.',
      },
    });
  }

  console.log('🎉 EduVerse database seed fully applied for ALL accounts!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
