import React from 'react';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PreviewBadge } from '@/components/shared/preview-badge';

export const metadata = {
  title: 'Instructors & Faculty — EduVerse',
  description: 'Meet verified professors, researchers, and industry educators teaching on EduVerse.',
};

const INSTRUCTORS = [
  {
    name: 'Dr. Abebe Bekele',
    title: 'Associate Professor of Computer Science',
    institution: 'Addis Ababa University',
    rating: 4.9,
    students: 3420,
    coursesCount: 4,
    avatarInitials: 'AB',
    expertise: ['TypeScript', 'Distributed Systems', 'PostgreSQL', 'Software Engineering'],
    bio: 'Over 15 years instructing algorithms, system architecture, and modern full-stack web technologies at Addis Ababa University Institute of Technology (AAiT).',
  },
  {
    name: 'Sara Tadesse, M.Sc.',
    title: 'Senior AI Researcher & Data Scientist',
    institution: 'EthioAI Research Institute',
    rating: 4.8,
    students: 2150,
    coursesCount: 3,
    avatarInitials: 'ST',
    expertise: ['Python', 'Machine Learning', 'NLP', 'Computer Vision'],
    bio: 'Lead machine learning engineer specializing in Amharic natural language processing and statistical modeling for Ethiopian financial services.',
  },
  {
    name: 'Dawit Yohannes',
    title: 'Principal Cloud Systems Architect',
    institution: 'Independent Cloud Consultant',
    rating: 4.9,
    students: 1890,
    coursesCount: 2,
    avatarInitials: 'DY',
    expertise: ['DevOps', 'Kubernetes', 'Docker', 'Linux Internals'],
    bio: 'Certified Kubernetes administrator with extensive experience deploying high-availability banking infrastructure across East Africa.',
  },
  {
    name: 'Almaz Mengistu, CPA',
    title: 'Lecturer in Corporate Finance & Accounting',
    institution: 'School of Commerce, AAU',
    rating: 4.7,
    students: 2800,
    coursesCount: 3,
    avatarInitials: 'AM',
    expertise: ['IFRS Accounting', 'Ethiopian Tax Law', 'Auditing', 'Financial Modeling'],
    bio: 'Licensed CPA advising major domestic enterprises on VAT compliance, financial reporting standards, and corporate governance.',
  },
  {
    name: 'Eng. Solomon Worku',
    title: 'Lecturer in Hardware & Robotics',
    institution: 'Adama Science & Technology University (ASTU)',
    rating: 4.8,
    students: 1420,
    coursesCount: 2,
    avatarInitials: 'SW',
    expertise: ['Embedded Systems', 'IoT', 'Microcontrollers', 'C/C++'],
    bio: 'Pioneering agricultural automation hardware and rural IoT sensor grids for moisture and soil monitoring in the Rift Valley.',
  },
  {
    name: 'Dr. Yared Fikre, MD',
    title: 'Assistant Professor of Public Health',
    institution: 'Hawassa University College of Medicine',
    rating: 4.9,
    students: 1650,
    coursesCount: 2,
    avatarInitials: 'YF',
    expertise: ['Epidemiology', 'Health Informatics', 'Biostatistics', 'Community Health'],
    bio: 'Specialist in regional communicable disease tracking and public health program evaluation in Southern Ethiopia.',
  },
];

export default function InstructorsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 space-y-12 pb-24">
      {/* Header */}
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Faculty Directory
          </span>
          <PreviewBadge label="Faculty Preview" phase="Phase 7B Engine" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-navy">
          Learn From Ethiopia's Leading Educators
        </h1>
        <p className="text-sm text-brand-slate">
          Every instructor on EduVerse is vetted for pedagogical excellence, real-world industry background, and academic qualification.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INSTRUCTORS.map((instructor, idx) => (
          <Card key={idx} className="border-brand-border flex flex-col justify-between hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-brand-navy text-white flex items-center justify-center text-lg font-bold shrink-0">
                  {instructor.avatarInitials}
                </div>
                <div>
                  <h3 className="font-bold text-brand-navy text-base leading-snug">{instructor.name}</h3>
                  <p className="text-xs text-brand-emerald font-medium mt-0.5">{instructor.title}</p>
                  <p className="text-xs text-brand-slate">{instructor.institution}</p>
                </div>
              </div>

              <p className="text-xs text-brand-slate leading-relaxed line-clamp-3">
                {instructor.bio}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {instructor.expertise.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] bg-slate-100 text-brand-navy border-none">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs text-brand-slate pt-3 border-t border-brand-border">
                <div>
                  <div className="font-bold text-brand-navy flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span>{instructor.rating}</span>
                  </div>
                  <span className="text-[10px]">Rating</span>
                </div>
                <div>
                  <div className="font-bold text-brand-navy">{instructor.students.toLocaleString()}</div>
                  <span className="text-[10px]">Students</span>
                </div>
                <div>
                  <div className="font-bold text-brand-navy">{instructor.coursesCount}</div>
                  <span className="text-[10px]">Courses</span>
                </div>
              </div>
            </CardContent>

            <div className="p-6 pt-0">
              <Link href="/courses">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Courses
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Become an Instructor CTA */}
      <div className="rounded-2xl border border-brand-border bg-gradient-to-r from-brand-mint/40 via-white to-brand-mint/40 p-8 sm:p-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-brand-navy">Are You an Educator or University Lecturer?</h2>
        <p className="text-sm text-brand-slate max-w-xl mx-auto">
          Reach thousands of ambitious students across Ethiopia. Leverage our low-bandwidth delivery engine, automated grading tools, and transparent local payouts.
        </p>
        <Link href="/contact" className="inline-block">
          <Button variant="emerald" className="gap-2">
            <span>Apply as an Instructor</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
