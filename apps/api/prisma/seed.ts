import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EduVerse database seed...');

  // 1. Seed Categories
  const categories = [
    { name: 'Computer Science & Tech', slug: 'computer-science-tech', description: 'Software engineering, algorithms, AI, cloud computing and web development.' },
    { name: 'Business & Entrepreneurship', slug: 'business-entrepreneurship', description: 'Startup growth, project management, finance and market strategy.' },
    { name: 'Health & Medicine', slug: 'health-medicine', description: 'Public health, clinical skills, biotechnology and healthcare informatics.' },
    { name: 'Engineering & Robotics', slug: 'engineering-robotics', description: 'Electrical, mechanical, civil engineering and embedded systems.' },
    { name: 'Natural Sciences & Math', slug: 'natural-sciences-math', description: 'Physics, chemistry, biology, statistics and applied calculus.' },
    { name: 'Languages & Communication', slug: 'languages-communication', description: 'English, Amharic, Oromo, Tigrinya, French and professional writing.' },
    { name: 'Arts & Humanities', slug: 'arts-humanities', description: 'History, philosophy, graphic design, UI/UX and creative media.' },
  ];

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
  }
  console.log(`✅ Seeded ${categories.length} academic categories.`);

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

  // 2. Seed Super Admin
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
  console.log(`✅ Seeded Super Admin: ${admin.email}`);

  // 3. Seed Demo Teacher
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
          timezone: 'Africa/Addis_Ababa',
        },
      },
    },
  });
  console.log(`✅ Seeded Demo Teacher: ${teacher.email}`);

  // 4. Seed Demo Student
  const student = await prisma.user.upsert({
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
          timezone: 'Africa/Addis_Ababa',
        },
      },
    },
  });
  console.log(`✅ Seeded Demo Student: ${student.email}`);

  console.log('🚀 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
