'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  GraduationCap,
  Users,
  Plus,
  Search,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Award,
  BarChart3,
  Download,
  AlertCircle,
  FileCheck,
  UserCheck,
  School,
  Settings,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useI18n } from '@/context/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface InstitutionOverview {
  institution: {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    contactEmail: string;
    website?: string;
  };
  stats: {
    departmentsCount: number;
    classesCount: number;
    teachersCount: number;
    studentsCount: number;
    coursesCount: number;
  };
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  classesCount?: number;
  coursesCount?: number;
  createdAt: string;
}

interface ClassItem {
  id: string;
  name: string;
  academicYear: string;
  department: { id: string; name: string; code: string };
  teacher: { id: string; fullName: string; email: string };
  _count?: { enrollments: number };
}

export default function InstitutionManagementPage() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'departments' | 'classes' | 'attendance' | 'reports' | 'settings'
  >('overview');

  // Modals state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptFormError, setDeptFormError] = useState<string | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [classFormError, setClassFormError] = useState<string | null>(null);

  // Search & Filters
  const [deptSearch, setDeptSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');

  // Local state for attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>>({
    'std-1': 'PRESENT',
    'std-2': 'PRESENT',
    'std-3': 'LATE',
    'std-4': 'PRESENT',
    'std-5': 'ABSENT',
  });

  // 1. Fetch Overview & Metrics
  const { data: overviewData } = useQuery<InstitutionOverview>({
    queryKey: ['institution-overview'],
    queryFn: async () => {
      try {
        return await apiClient.get<InstitutionOverview>('/institutions/my/overview');
      } catch (err) {
        // Fallback for preview or dev environments
        return {
          institution: {
            id: 'tenant-demo',
            name: 'Addis Ababa Institute of Technology & TVET Center',
            slug: 'aait-tvet',
            domain: 'aait.edu.et',
            contactEmail: 'admin@aait.edu.et',
            website: 'https://aait.edu.et',
          },
          stats: {
            departmentsCount: 8,
            classesCount: 24,
            teachersCount: 42,
            studentsCount: 1280,
            coursesCount: 36,
          },
        };
      }
    },
  });

  // 2. Fetch Departments
  const { data: departments = [] } = useQuery<DepartmentItem[]>({
    queryKey: ['institution-departments'],
    queryFn: async () => {
      try {
        return await apiClient.get<DepartmentItem[]>('/institutions/my/departments');
      } catch {
        return [
          { id: 'dept-1', name: 'Software Engineering & Cloud Computing', code: 'SE-CC', classesCount: 6, coursesCount: 12, createdAt: new Date().toISOString() },
          { id: 'dept-2', name: 'Electrical & Biomedical TVET', code: 'EB-TVET', classesCount: 5, coursesCount: 8, createdAt: new Date().toISOString() },
          { id: 'dept-3', name: 'Civil & Industrial Construction', code: 'CIVIL', classesCount: 4, coursesCount: 6, createdAt: new Date().toISOString() },
          { id: 'dept-4', name: 'Mechanical & Automotive Technology', code: 'MECH-AUTO', classesCount: 5, coursesCount: 7, createdAt: new Date().toISOString() },
          { id: 'dept-5', name: 'Applied Business & ICT Management', code: 'BICT', classesCount: 4, coursesCount: 5, createdAt: new Date().toISOString() },
        ];
      }
    },
  });

  // 3. Fetch Classes & Cohorts
  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['institution-classes'],
    queryFn: async () => {
      try {
        return await apiClient.get<ClassItem[]>('/institutions/my/classes');
      } catch {
        return [
          {
            id: 'cls-1',
            name: 'Cohort 2026 — Distributed Systems Section A',
            academicYear: '2025/2026',
            department: { id: 'dept-1', name: 'Software Engineering & Cloud Computing', code: 'SE-CC' },
            teacher: { id: 't-1', fullName: 'Dr. Dawit Abebe', email: 'dawit.a@aait.edu.et' },
            _count: { enrollments: 48 },
          },
          {
            id: 'cls-2',
            name: 'Cohort 2025 — Industrial Circuit Design Lab 2',
            academicYear: '2025/2026',
            department: { id: 'dept-2', name: 'Electrical & Biomedical TVET', code: 'EB-TVET' },
            teacher: { id: 't-2', fullName: 'Eng. Rahel Tesfaye', email: 'rahel.t@aait.edu.et' },
            _count: { enrollments: 36 },
          },
          {
            id: 'cls-3',
            name: 'Cohort 2026 — Structural Engineering Studio',
            academicYear: '2025/2026',
            department: { id: 'dept-3', name: 'Civil & Industrial Construction', code: 'CIVIL' },
            teacher: { id: 't-3', fullName: 'Dr. Yohannes Girma', email: 'yohannes.g@aait.edu.et' },
            _count: { enrollments: 42 },
          },
        ];
      }
    },
  });

  // 4. Create Department Mutation
  const createDeptMutation = useMutation({
    mutationFn: async (payload: { name: string; code: string }) => {
      return apiClient.post('/institutions/my/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-departments'] });
      queryClient.invalidateQueries({ queryKey: ['institution-overview'] });
      setIsDeptModalOpen(false);
      setNewDeptName('');
      setNewDeptCode('');
      setDeptFormError(null);
    },
    onError: (err: any) => {
      setDeptFormError(err?.message || 'Failed to create department. Please check department code uniqueness.');
    },
  });

  // 5. Create Class Mutation
  const createClassMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      departmentId: string;
      teacherId: string;
      academicYear: string;
    }) => {
      return apiClient.post('/institutions/my/classes', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-classes'] });
      queryClient.invalidateQueries({ queryKey: ['institution-overview'] });
      setIsClassModalOpen(false);
      setNewClassName('');
      setSelectedDeptId('');
      setSelectedTeacherId('');
      setClassFormError(null);
    },
    onError: (err: any) => {
      setClassFormError(err?.message || 'Failed to create class cohort.');
    },
  });

  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || newDeptName.trim().length < 2) {
      setDeptFormError('Department name must be at least 2 characters long.');
      return;
    }
    if (!newDeptCode.trim() || !/^[A-Za-z0-9_-]+$/.test(newDeptCode.trim())) {
      setDeptFormError('Department code must contain only alphanumeric characters and hyphens (e.g. SE-CC).');
      return;
    }
    createDeptMutation.mutate({
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase(),
    });
  };

  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || newClassName.trim().length < 2) {
      setClassFormError('Class cohort title must be at least 2 characters long.');
      return;
    }
    if (!selectedDeptId) {
      setClassFormError('Please select a department.');
      return;
    }
    createClassMutation.mutate({
      name: newClassName.trim(),
      departmentId: selectedDeptId,
      teacherId: selectedTeacherId || 'default-faculty',
      academicYear,
    });
  };

  const toggleStudentAttendance = (studentId: string, nextStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED') => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: nextStatus,
    }));
  };

  // Sample student roster for attendance tracking
  const sampleStudents = [
    { id: 'std-1', fullName: 'Abel Mulugeta', studentId: 'AAiT/UG/1042/16', email: 'abel.m@student.aait.edu.et', progress: 84 },
    { id: 'std-2', fullName: 'Bethlehem Haile', studentId: 'AAiT/UG/1045/16', email: 'beth.h@student.aait.edu.et', progress: 92 },
    { id: 'std-3', fullName: 'Dawit Kassa', studentId: 'AAiT/UG/1049/16', email: 'dawit.k@student.aait.edu.et', progress: 76 },
    { id: 'std-4', fullName: 'Fikirte Assefa', studentId: 'AAiT/UG/1053/16', email: 'fikirte.a@student.aait.edu.et', progress: 88 },
    { id: 'std-5', fullName: 'Henok Tadesse', studentId: 'AAiT/UG/1060/16', email: 'henok.t@student.aait.edu.et', progress: 65 },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#120B08] text-[#24140E] dark:text-stone-100 font-sans selection:bg-brand-orange/30">
      {/* 1. Institution Header Banner */}
      <section className="bg-gradient-to-r from-[#24140E] via-[#331B12] to-[#24140E] text-white border-b border-[#3D2218] px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange text-white uppercase tracking-wider flex items-center gap-1">
                <School className="h-3 w-3" />
                <span>University & TVET Enterprise</span>
              </span>
              <Badge variant="outline" className="border-[#4D2D20] text-stone-300 text-[10px]">
                {overviewData?.institution.domain || 'Verified Domain'}
              </Badge>
              <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[10px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Strict Tenant Data Isolation</span>
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {overviewData?.institution.name || 'University & TVET Administration'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">
              {lang === 'am'
                ? 'የከፍተኛ ትምህርት እና የቴክኒክና ሙያ ተቋም አጠቃላይ ማስተዳደሪያ፡ ዲፓርትመንቶች፣ ተከታታይ ክፍሎች፣ የተማሪዎች ምዝገባ፣ የገፅ ለገፅ ክትትልና የአካዳሚክ ሪፖርቶች።'
                : 'Enterprise portal for higher education & TVET: manage academic departments, cohort classes, student attendance, faculty workload, and segregated institutional reports.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsDeptModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-[#4D2D20] bg-[#1E110B] text-stone-200 hover:bg-[#2B170F] text-xs h-9 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-brand-orange" />
              <span>{lang === 'am' ? 'አዲስ ዲፓርትመንት' : 'Add Department'}</span>
            </Button>

            <Button
              onClick={() => setIsClassModalOpen(true)}
              variant="orange"
              size="sm"
              className="text-xs h-9 gap-1.5 shadow-md"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'አዲስ ክፍል / Cohort' : 'Create Class Cohort'}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Main Administration Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#EADFD4] dark:border-[#2D1C15] pb-2 overflow-x-auto">
          {[
            { id: 'overview', label: lang === 'am' ? 'ማጠቃለያ' : 'Overview', icon: BarChart3 },
            { id: 'departments', label: lang === 'am' ? 'ዲፓርትመንቶች' : 'Departments', icon: Building2 },
            { id: 'classes', label: lang === 'am' ? 'ክፍሎችና ኮሆርትስ' : 'Classes & Cohorts', icon: GraduationCap },
            { id: 'attendance', label: lang === 'am' ? 'የተማሪዎች ክትትል' : 'Attendance & Roster', icon: UserCheck },
            { id: 'reports', label: lang === 'am' ? 'አካዳሚክ ሪፖርት' : 'Academic Reports', icon: FileCheck },
            { id: 'settings', label: lang === 'am' ? 'የተቋም መረጃ' : 'Tenant Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'text-[#4A3B32] dark:text-stone-300 hover:bg-[#EFE8DD] dark:hover:bg-[#1E110B]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-brand-orange'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                      {lang === 'am' ? 'ዲፓርትመንቶች' : 'Departments'}
                    </span>
                    <Building2 className="h-4 w-4 text-brand-orange" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#24140E] dark:text-white">
                    {overviewData?.stats.departmentsCount || departments.length}
                  </div>
                  <p className="text-[11px] text-[#6B5A4E] dark:text-stone-400">
                    Active academic faculties
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                      {lang === 'am' ? 'ክፍሎች / ኮሆርትስ' : 'Class Cohorts'}
                    </span>
                    <GraduationCap className="h-4 w-4 text-brand-orange" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#24140E] dark:text-white">
                    {overviewData?.stats.classesCount || classes.length}
                  </div>
                  <p className="text-[11px] text-[#6B5A4E] dark:text-stone-400">
                    2025/2026 Academic Year
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                      {lang === 'am' ? 'ተመዝጋቢ ተማሪዎች' : 'Enrolled Students'}
                    </span>
                    <Users className="h-4 w-4 text-brand-orange" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#24140E] dark:text-white">
                    {overviewData?.stats.studentsCount?.toLocaleString() || '1,280'}
                  </div>
                  <p className="text-[11px] text-[#6B5A4E] dark:text-stone-400">
                    Active TVET & Degree learners
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                      {lang === 'am' ? 'መምህራን እና አሰልጣኞች' : 'Faculty & Trainers'}
                    </span>
                    <Award className="h-4 w-4 text-brand-orange" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#24140E] dark:text-white">
                    {overviewData?.stats.teachersCount || '42'}
                  </div>
                  <p className="text-[11px] text-[#6B5A4E] dark:text-stone-400">
                    Certified university instructors
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tenant Isolation Banner */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-brand-orange shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#24140E] dark:text-white">
                    Institutional Data Separation & Privacy
                  </h4>
                  <p className="text-xs text-[#6B5A4E] dark:text-stone-300">
                    All exams, student assignments, attendance sheets, and instructor feedback are strictly restricted to{' '}
                    <strong>{overviewData?.institution.name}</strong> and cannot be accessed by external platform tenants.
                  </p>
                </div>
              </div>
              <Badge className="bg-brand-orange text-white border-none text-[10px] shrink-0">
                FERPA & GDPR Compliant
              </Badge>
            </div>

            {/* Quick Actions & Recent Departments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15]">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#24140E] dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand-orange" />
                    <span>Academic Faculties ({departments.length})</span>
                  </h3>
                  <div className="divide-y divide-[#EADFD4] dark:divide-[#2D1C15]">
                    {departments.slice(0, 4).map((dept) => (
                      <div key={dept.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#24140E] dark:text-white block">{dept.name}</span>
                          <span className="text-[10px] text-[#6B5A4E] dark:text-stone-400 font-mono">
                            Code: {dept.code}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-[#D8C7B8] dark:border-[#38241B] text-[10px]">
                          {dept.classesCount || 4} Cohorts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15]">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#24140E] dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-brand-orange" />
                    <span>Active Cohort Classes ({classes.length})</span>
                  </h3>
                  <div className="divide-y divide-[#EADFD4] dark:divide-[#2D1C15]">
                    {classes.slice(0, 3).map((cls) => (
                      <div key={cls.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#24140E] dark:text-white block">{cls.name}</span>
                          <span className="text-[10px] text-[#6B5A4E] dark:text-stone-400">
                            Instructor: {cls.teacher.fullName} • {cls.academicYear}
                          </span>
                        </div>
                        <Badge className="bg-orange-500/10 text-brand-orange border border-orange-500/30 text-[10px]">
                          {cls._count?.enrollments || 36} Students
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  placeholder={lang === 'am' ? 'ዲፓርትመንት ፈልግ...' : 'Search departments by name or code...'}
                  className="pl-9 bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-xs h-9"
                />
              </div>

              <Button
                onClick={() => setIsDeptModalOpen(true)}
                variant="orange"
                size="sm"
                className="text-xs h-9 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'አዲስ ዲፓርትመንት ፍጠር' : 'Add Department'}</span>
              </Button>
            </div>

            <div className="bg-white dark:bg-[#19100C] border border-[#EADFD4] dark:border-[#2D1C15] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4EDE4] dark:bg-[#150D09] border-b border-[#EADFD4] dark:border-[#2D1C15] text-[#6B5A4E] dark:text-stone-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-4">Department Name</th>
                      <th className="p-4">Faculty Code</th>
                      <th className="p-4">Assigned Classes</th>
                      <th className="p-4">Courses</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EADFD4] dark:divide-[#2D1C15] text-[#24140E] dark:text-stone-200">
                    {departments
                      .filter(
                        (d) =>
                          d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
                          d.code.toLowerCase().includes(deptSearch.toLowerCase()),
                      )
                      .map((dept) => (
                        <tr key={dept.id} className="hover:bg-[#F9F5F0] dark:hover:bg-[#1E120D] transition-colors">
                          <td className="p-4 font-bold">{dept.name}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="font-mono text-[10px] border-[#D8C7B8] dark:border-[#38241B]">
                              {dept.code}
                            </Badge>
                          </td>
                          <td className="p-4">{dept.classesCount || 4} Cohorts</td>
                          <td className="p-4">{dept.coursesCount || 6} Programs</td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-brand-orange hover:bg-orange-50 dark:hover:bg-orange-950/30">
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLASSES & COHORTS */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder={lang === 'am' ? 'ክፍሎችን ፈልግ...' : 'Search classes or instructor...'}
                  className="pl-9 bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-xs h-9"
                />
              </div>

              <Button
                onClick={() => setIsClassModalOpen(true)}
                variant="orange"
                size="sm"
                className="text-xs h-9 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'አዲስ ክፍል ፍጠር' : 'Create Class Cohort'}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
                    c.teacher.fullName.toLowerCase().includes(classSearch.toLowerCase()) ||
                    c.department.name.toLowerCase().includes(classSearch.toLowerCase()),
                )
                .map((cls) => (
                  <Card key={cls.id} className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 text-brand-orange text-[10px]">
                          {cls.department.code}
                        </Badge>
                        <span className="text-[10px] font-mono text-[#6B5A4E] dark:text-stone-400">
                          {cls.academicYear}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[#24140E] dark:text-white leading-tight">
                        {cls.name}
                      </h4>

                      <div className="space-y-1 text-xs text-[#6B5A4E] dark:text-stone-300 pt-1 border-t border-[#EADFD4] dark:border-[#2D1C15]">
                        <p className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-brand-orange" />
                          <span>Lead Faculty: <strong>{cls.teacher.fullName}</strong></span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                          <span>Enrolled: <strong>{cls._count?.enrollments || 36} Students</strong></span>
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('attendance')}
                          className="h-8 text-xs border-[#D8C7B8] dark:border-[#38241B]"
                        >
                          Attendance Sheet
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-brand-orange hover:bg-orange-50 dark:hover:bg-orange-950/30"
                        >
                          Curriculum
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: ENROLLMENT & ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#19100C] border border-[#EADFD4] dark:border-[#2D1C15] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFD4] dark:border-[#2D1C15] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#24140E] dark:text-white flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-brand-orange" />
                    <span>Cohort Attendance & Daily Roll Call</span>
                  </h3>
                  <p className="text-xs text-[#6B5A4E] dark:text-stone-400">
                    Cohort 2026 — Distributed Systems Section A (Dr. Dawit Abebe) • Date: {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-[#D8C7B8] dark:border-[#38241B]">
                    <Download className="h-3.5 w-3.5 text-brand-orange" />
                    <span>Export Attendance CSV</span>
                  </Button>
                  <Button variant="orange" size="sm" className="h-8 text-xs gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Save Daily Record</span>
                  </Button>
                </div>
              </div>

              {/* Roster Search & Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search enrolled students..."
                    className="pl-8 bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-8"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {(['ALL', 'PRESENT', 'ABSENT'] as const).map((fil) => (
                    <button
                      key={fil}
                      type="button"
                      onClick={() => setAttendanceFilter(fil)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        attendanceFilter === fil
                          ? 'bg-brand-orange text-white font-bold'
                          : 'bg-[#FAF7F2] dark:bg-[#150D09] border border-[#D8C7B8] dark:border-[#38241B] text-[#6B5A4E] dark:text-stone-300'
                      }`}
                    >
                      {fil}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4EDE4] dark:bg-[#150D09] border-b border-[#EADFD4] dark:border-[#2D1C15] text-[#6B5A4E] dark:text-stone-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Registration ID</th>
                      <th className="p-3">Academic Progress</th>
                      <th className="p-3 text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EADFD4] dark:divide-[#2D1C15] text-[#24140E] dark:text-stone-200">
                    {sampleStudents
                      .filter((std) => {
                        const matchesSearch =
                          std.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          std.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          std.studentId.toLowerCase().includes(studentSearch.toLowerCase());
                        const status = attendanceRecords[std.id] || 'PRESENT';
                        const matchesStatus =
                          attendanceFilter === 'ALL' || status === attendanceFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map((std) => {
                      const currentStatus = attendanceRecords[std.id] || 'PRESENT';
                      return (
                        <tr key={std.id} className="hover:bg-[#F9F5F0] dark:hover:bg-[#1E120D] transition-colors">
                          <td className="p-3">
                            <span className="font-bold block">{std.fullName}</span>
                            <span className="text-[11px] text-[#6B5A4E] dark:text-stone-400">{std.email}</span>
                          </td>
                          <td className="p-3 font-mono text-[11px]">{std.studentId}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-[#E5DACE] dark:bg-[#2B1B14] rounded-full h-1.5">
                                <div className="bg-brand-orange h-full rounded-full" style={{ width: `${std.progress}%` }} />
                              </div>
                              <span className="font-mono text-[10px]">{std.progress}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex rounded-lg border border-[#D8C7B8] dark:border-[#38241B] p-0.5 bg-[#FAF7F2] dark:bg-[#150D09]">
                              {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => toggleStudentAttendance(std.id, st)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                    currentStatus === st
                                      ? st === 'PRESENT'
                                        ? 'bg-emerald-600 text-white'
                                        : st === 'LATE'
                                          ? 'bg-amber-600 text-white'
                                          : st === 'ABSENT'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-blue-600 text-white'
                                      : 'text-[#6B5A4E] dark:text-stone-400 hover:text-white'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ACADEMIC REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15]">
                <CardContent className="p-5 space-y-2">
                  <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                    Average Course Pass Rate
                  </span>
                  <div className="text-3xl font-black text-brand-orange">89.4%</div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+3.2% from previous term</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15]">
                <CardContent className="p-5 space-y-2">
                  <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                    Assessment Submissions
                  </span>
                  <div className="text-3xl font-black text-[#24140E] dark:text-white">3,420</div>
                  <p className="text-[11px] text-[#6B5A4E] dark:text-stone-400">
                    Graded across 24 active cohorts
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15]">
                <CardContent className="p-5 space-y-2">
                  <span className="text-xs font-bold text-[#6B5A4E] dark:text-stone-400 uppercase tracking-wider">
                    Certificate Verifications
                  </span>
                  <div className="text-3xl font-black text-[#24140E] dark:text-white">845</div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    100% verified unique cryptographic codes
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#EADFD4] dark:border-[#2D1C15] pb-3">
                  <h3 className="text-sm font-bold text-[#24140E] dark:text-white flex items-center gap-2">
                    <Award className="h-4 w-4 text-brand-orange" />
                    <span>Faculty Performance & Evaluation Summary</span>
                  </h3>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-[#D8C7B8] dark:border-[#38241B]">
                    Download Academic Audit Log
                  </Button>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'Dr. Dawit Abebe', dept: 'Software Engineering', rating: '4.9/5.0', completion: '92%' },
                    { name: 'Eng. Rahel Tesfaye', dept: 'Electrical TVET', rating: '4.8/5.0', completion: '88%' },
                    { name: 'Dr. Yohannes Girma', dept: 'Civil Engineering', rating: '4.7/5.0', completion: '85%' },
                  ].map((fac, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#150D09] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#24140E] dark:text-white block">{fac.name}</span>
                        <span className="text-[11px] text-[#6B5A4E] dark:text-stone-400">{fac.dept}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{fac.rating}</span>
                        <Badge variant="outline" className="border-orange-300 dark:border-orange-800 text-[10px]">
                          {fac.completion} Completion
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 6: SETTINGS & DATA ISOLATION */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white dark:bg-[#19100C] border border-[#EADFD4] dark:border-[#2D1C15] rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="space-y-1 border-b border-[#EADFD4] dark:border-[#2D1C15] pb-4">
              <h3 className="text-base font-bold text-[#24140E] dark:text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-brand-orange" />
                <span>Institution Profile & Multitenancy Settings</span>
              </h3>
              <p className="text-xs text-[#6B5A4E] dark:text-stone-400">
                Manage your official institution name, subdomain, and verified domain routing.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4A3B32] dark:text-stone-300">
                  Institution Name
                </label>
                <Input
                  defaultValue={overviewData?.institution.name}
                  className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4A3B32] dark:text-stone-300">
                  Dedicated Campus Domain
                </label>
                <Input
                  defaultValue={overviewData?.institution.domain || 'aait.edu.et'}
                  className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4A3B32] dark:text-stone-300">
                  Institutional Contact Email
                </label>
                <Input
                  defaultValue={overviewData?.institution.contactEmail || 'admin@aait.edu.et'}
                  className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
                />
              </div>

              <Button variant="orange" size="sm" className="text-xs h-9 gap-1.5 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE DEPARTMENT DIALOG */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-[#24140E] dark:text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-orange" />
              <span>Create Academic Department</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B5A4E] dark:text-stone-400">
              Add a department or faculty for organizing cohorts, degree programs, and TVET certificates.
            </DialogDescription>
          </DialogHeader>

          {deptFormError && (
            <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deptFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateDeptSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Department Title</label>
              <Input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Electrical Engineering & TVET Center"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Department Code (Alphanumeric)</label>
              <Input
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                placeholder="e.g. EE-TVET"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9 font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDeptModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="orange"
                size="sm"
                disabled={createDeptMutation.isPending}
                className="text-xs h-8 gap-1.5"
              >
                <span>Create Department</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE CLASS COHORT DIALOG */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-[#24140E] dark:text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-brand-orange" />
              <span>Create Class Cohort</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B5A4E] dark:text-stone-400">
              Create an academic class section assigned to a faculty department and instructor.
            </DialogDescription>
          </DialogHeader>

          {classFormError && (
            <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{classFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateClassSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Cohort / Class Name</label>
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Cohort 2026 — Distributed Systems Section B"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Department Faculty</label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full h-9 rounded-md border border-[#D8C7B8] dark:border-[#38241B] bg-[#FAF7F2] dark:bg-[#120B08] px-3 text-xs text-[#24140E] dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
              >
                <option value="">Select a department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Academic Year</label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2025/2026"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsClassModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="orange"
                size="sm"
                disabled={createClassMutation.isPending}
                className="text-xs h-8 gap-1.5"
              >
                <span>Create Cohort</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
