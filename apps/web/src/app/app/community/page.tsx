'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Megaphone,
  Plus,
  Search,
  CheckCircle2,
  ThumbsUp,
  Calendar,
  HelpCircle,
  ShieldCheck,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useI18n } from '@/context/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  category: 'ENGINEERING' | 'TVET' | 'COMPUTER_SCIENCE' | 'BUSINESS' | 'HEALTH';
  memberCount: number;
  isMember?: boolean;
  meetingSchedule: string;
  isModerated: boolean;
  leadModerator: string;
  createdAt: string;
}

interface CommunityThread {
  id: string;
  title: string;
  content: string;
  courseTitle?: string;
  author: {
    fullName: string;
    role: 'STUDENT' | 'INSTRUCTOR' | 'TA';
  };
  upvotes: number;
  hasUpvoted?: boolean;
  repliesCount: number;
  isSolved?: boolean;
  createdAt: string;
}

export default function LearningCommunityHubPage() {
  const { lang } = useI18n();

  const [activeTab, setActiveTab] = useState<'groups' | 'discussions' | 'announcements'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCat, setNewGroupCat] = useState<'ENGINEERING' | 'TVET' | 'COMPUTER_SCIENCE' | 'BUSINESS' | 'HEALTH'>('COMPUTER_SCIENCE');
  const [newGroupSchedule, setNewGroupSchedule] = useState('');
  const [groupFormError, setGroupFormError] = useState<string | null>(null);

  // Ask Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [newQTitle, setNewQTitle] = useState('');
  const [newQContent, setNewQContent] = useState('');
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);

  // Seed study groups with localStorage persistence
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [threads, setThreads] = useState<CommunityThread[]>([]);

  useEffect(() => {
    try {
      const cachedGroups = localStorage.getItem('eduverse_study_groups');
      if (cachedGroups) {
        setStudyGroups(JSON.parse(cachedGroups));
      } else {
        const initialGroups: StudyGroup[] = [
          {
            id: 'grp-1',
            name: 'Distributed Systems & Cloud DevOps Circle',
            description: 'Weekly peer review of microservices assignments, Docker lab environments, and low-bandwidth cloud architectures.',
            category: 'COMPUTER_SCIENCE',
            memberCount: 84,
            isMember: true,
            meetingSchedule: 'Wednesdays @ 5:00 PM (EAT)',
            isModerated: true,
            leadModerator: 'Dr. Dawit Abebe & Biniyam T.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'grp-2',
            name: 'Electrical Circuit & TVET Workshop Masters',
            description: 'Collaborative troubleshooting of circuit diagrams, low-voltage power distribution, and hands-on laboratory exercises.',
            category: 'TVET',
            memberCount: 62,
            isMember: false,
            meetingSchedule: 'Saturdays @ 10:00 AM (EAT)',
            isModerated: true,
            leadModerator: 'Eng. Rahel Tesfaye',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'grp-3',
            name: 'Structural Analysis & CAD Study Squad',
            description: 'Solving statics problems, shear diagrams, and drafting standards for civil infrastructure projects.',
            category: 'ENGINEERING',
            memberCount: 51,
            isMember: false,
            meetingSchedule: 'Tuesdays @ 6:00 PM (EAT)',
            isModerated: true,
            leadModerator: 'Dr. Yohannes Girma',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'grp-4',
            name: 'ICT Business & Entrepreneurship Incubator',
            description: 'Financial modeling, market feasibility for tech ventures in East Africa, and presentation pitch practice.',
            category: 'BUSINESS',
            memberCount: 39,
            isMember: false,
            meetingSchedule: 'Thursdays @ 4:30 PM (EAT)',
            isModerated: true,
            leadModerator: 'Prof. Almaz Bekele',
            createdAt: new Date().toISOString(),
          },
        ];
        setStudyGroups(initialGroups);
        localStorage.setItem('eduverse_study_groups', JSON.stringify(initialGroups));
      }

      const cachedThreads = localStorage.getItem('eduverse_global_threads');
      if (cachedThreads) {
        setThreads(JSON.parse(cachedThreads));
      } else {
        const initialThreads: CommunityThread[] = [
          {
            id: 'th-1',
            title: 'How to optimize PostgreSQL queries for large enrollment tables in low-bandwidth TVET portals?',
            content: 'When joining courses with section attendance records, what indexing strategy offers the best reduction in memory cache overhead?',
            courseTitle: 'Full-Stack Web Development Bootcamp',
            author: { fullName: 'Marta Haile', role: 'STUDENT' },
            upvotes: 28,
            hasUpvoted: true,
            repliesCount: 6,
            isSolved: true,
            createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          },
          {
            id: 'th-2',
            title: 'Study tips for TVET Level IV Electrical Certification National Exam',
            content: 'Sharing revision summary sheets and past examination multiple-choice questions with verified answer explanations.',
            courseTitle: 'Electrical Installation & Safety Standards',
            author: { fullName: 'Eng. Rahel Tesfaye', role: 'INSTRUCTOR' },
            upvotes: 45,
            hasUpvoted: false,
            repliesCount: 14,
            isSolved: false,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'th-3',
            title: 'Where can I download the offline PDF packets for Section 3 math exercises?',
            content: 'My cellular connection has high latency during the day. Can someone verify if the offline study packet download is in tab 3?',
            courseTitle: 'Applied Engineering Mathematics',
            author: { fullName: 'Yonas Gebre', role: 'STUDENT' },
            upvotes: 12,
            hasUpvoted: false,
            repliesCount: 3,
            isSolved: true,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ];
        setThreads(initialThreads);
        localStorage.setItem('eduverse_global_threads', JSON.stringify(initialThreads));
      }
    } catch {}
  }, []);

  const handleToggleMembership = (groupId: string) => {
    const updated = studyGroups.map((grp) => {
      if (grp.id === groupId) {
        const nextState = !grp.isMember;
        return {
          ...grp,
          isMember: nextState,
          memberCount: nextState ? grp.memberCount + 1 : grp.memberCount - 1,
        };
      }
      return grp;
    });
    setStudyGroups(updated);
    try {
      localStorage.setItem('eduverse_study_groups', JSON.stringify(updated));
    } catch {}
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || newGroupName.trim().length < 3) {
      setGroupFormError('Group name must be at least 3 characters long.');
      return;
    }
    if (!newGroupDesc.trim() || newGroupDesc.trim().length < 10) {
      setGroupFormError('Please provide a clear study purpose and description (at least 10 characters).');
      return;
    }

    const newGroup: StudyGroup = {
      id: `grp-${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      category: newGroupCat,
      memberCount: 1,
      isMember: true,
      meetingSchedule: newGroupSchedule.trim() || 'Weekly peer sync',
      isModerated: true,
      leadModerator: 'You (Creator)',
      createdAt: new Date().toISOString(),
    };

    const updated = [newGroup, ...studyGroups];
    setStudyGroups(updated);
    try {
      localStorage.setItem('eduverse_study_groups', JSON.stringify(updated));
    } catch {}

    setIsGroupModalOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupSchedule('');
    setGroupFormError(null);
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQTitle.trim() || newQTitle.trim().length < 5) {
      setQuestionFormError('Question title must be at least 5 characters.');
      return;
    }
    if (!newQContent.trim() || newQContent.trim().length < 10) {
      setQuestionFormError('Please describe your question in full detail (at least 10 characters).');
      return;
    }

    const newThread: CommunityThread = {
      id: `th-${Date.now()}`,
      title: newQTitle.trim(),
      content: newQContent.trim(),
      author: { fullName: 'Learner (You)', role: 'STUDENT' },
      upvotes: 1,
      hasUpvoted: true,
      repliesCount: 0,
      isSolved: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newThread, ...threads];
    setThreads(updated);
    try {
      localStorage.setItem('eduverse_global_threads', JSON.stringify(updated));
    } catch {}

    setIsQuestionModalOpen(false);
    setNewQTitle('');
    setNewQContent('');
    setQuestionFormError(null);
  };

  const handleUpvote = (id: string) => {
    const updated = threads.map((th) => {
      if (th.id === id) {
        const nextUpvoted = !th.hasUpvoted;
        return {
          ...th,
          hasUpvoted: nextUpvoted,
          upvotes: nextUpvoted ? th.upvotes + 1 : th.upvotes - 1,
        };
      }
      return th;
    });
    setThreads(updated);
    try {
      localStorage.setItem('eduverse_global_threads', JSON.stringify(updated));
    } catch {}
  };

  const filteredGroups = studyGroups.filter((grp) => {
    const matchesSearch =
      grp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || grp.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#120B08] text-[#24140E] dark:text-stone-100 font-sans selection:bg-brand-orange/30">
      {/* 1. Community Header Banner */}
      <section className="bg-gradient-to-r from-[#24140E] via-[#331B12] to-[#24140E] text-white border-b border-[#3D2218] px-4 sm:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange text-white uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>EduVerse Peer Network</span>
              </span>
              <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[10px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Faculty-Moderated Communities</span>
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {lang === 'am' ? 'የትምህርት ማህበረሰብ እና የጥናት ቡድኖች' : 'Learning Community & Study Groups'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">
              {lang === 'am'
                ? 'በዩኒቨርሲቲ እና በቴክኒክና ሙያ ተማሪዎች የተደራጁ የጥናት ቡድኖችን ይቀላቀሉ፣ ጥያቄዎችን ይጠይቁ፣ እንዲሁም ከአስተማሪዎች ማስታወቂያዎችን ይከታተሉ።'
                : 'Join peer study circles, solve academic challenges with classmates, ask questions answered by verified instructors, and stay updated with official announcements.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsGroupModalOpen(true)}
              variant="outline"
              size="sm"
              className="border-[#4D2D20] bg-[#1E110B] text-stone-200 hover:bg-[#2B170F] text-xs h-9 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-brand-orange" />
              <span>{lang === 'am' ? 'አዲስ የጥናት ቡድን' : 'Start Study Group'}</span>
            </Button>

            <Button
              onClick={() => setIsQuestionModalOpen(true)}
              variant="orange"
              size="sm"
              className="text-xs h-9 gap-1.5 shadow-md"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'ጥያቄ ጠይቅ' : 'Ask Question'}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Main Community Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#EADFD4] dark:border-[#2D1C15] pb-2 overflow-x-auto">
          {[
            { id: 'groups', label: lang === 'am' ? 'የጥናት ቡድኖች' : 'Study Circles', count: studyGroups.length, icon: Users },
            { id: 'discussions', label: lang === 'am' ? 'የጥያቄና መልስ መድረክ' : 'Q&A Discussions', count: threads.length, icon: MessageSquare },
            { id: 'announcements', label: lang === 'am' ? 'የአስተማሪ ማስታወቂያዎች' : 'Instructor Announcements', count: 3, icon: Megaphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'text-[#4A3B32] dark:text-stone-300 hover:bg-[#EFE8DD] dark:hover:bg-[#1E110B]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-brand-orange'}`} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-[#EADFD4] dark:bg-[#2D1C15] text-[#6B5A4E] dark:text-stone-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: STUDY GROUPS */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Filters Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'am' ? 'የጥናት ቡድን ፈልግ...' : 'Search study groups...'}
                  className="pl-9 bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'All Fields' },
                  { id: 'COMPUTER_SCIENCE', label: 'Computer Science' },
                  { id: 'TVET', label: 'TVET Trades' },
                  { id: 'ENGINEERING', label: 'Engineering' },
                  { id: 'BUSINESS', label: 'Business' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                      selectedCategory === cat.id
                        ? 'bg-[#24140E] dark:bg-brand-orange text-white'
                        : 'bg-white dark:bg-[#19100C] border border-[#EADFD4] dark:border-[#2D1C15] text-[#6B5A4E] dark:text-stone-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Study Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGroups.map((grp) => (
                <Card
                  key={grp.id}
                  className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] shadow-sm hover:border-brand-orange/40 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 text-brand-orange text-[10px] font-mono">
                            {grp.category}
                          </Badge>
                          {grp.isModerated && (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              <span>Moderated</span>
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-[#24140E] dark:text-white leading-tight pt-1">
                          {grp.name}
                        </h3>
                      </div>

                      <Button
                        onClick={() => handleToggleMembership(grp.id)}
                        variant={grp.isMember ? 'outline' : 'orange'}
                        size="sm"
                        className={`text-xs h-8 shrink-0 ${
                          grp.isMember
                            ? 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'shadow-sm'
                        }`}
                      >
                        {grp.isMember ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            <span>Joined</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            <span>Join Group</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-[#6B5A4E] dark:text-stone-300 leading-relaxed">
                      {grp.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-[#6B5A4E] dark:text-stone-400 border-t border-[#EADFD4] dark:border-[#2D1C15] pt-3">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Schedule: <strong>{grp.meetingSchedule}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Active Members: <strong>{grp.memberCount} enrolled students</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Faculty Sponsor: <strong>{grp.leadModerator}</strong></span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: DISCUSSIONS & Q&A */}
        {activeTab === 'discussions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'am' ? 'ጥያቄዎችን ፈልግ...' : 'Search questions and topics...'}
                  className="pl-9 bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-xs h-9"
                />
              </div>

              <Button
                onClick={() => setIsQuestionModalOpen(true)}
                variant="orange"
                size="sm"
                className="text-xs h-9 gap-1.5"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'አዲስ ጥያቄ ጠይቅ' : 'Ask Question'}</span>
              </Button>
            </div>

            <div className="space-y-4">
              {threads.map((th) => (
                <div
                  key={th.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#19100C] border border-[#EADFD4] dark:border-[#2D1C15] shadow-sm hover:border-brand-orange/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {th.courseTitle && (
                          <Badge variant="outline" className="border-orange-200 dark:border-orange-900/40 text-brand-orange text-[10px]">
                            {th.courseTitle}
                          </Badge>
                        )}
                        {th.isSolved && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Solved</span>
                          </Badge>
                        )}
                        <span className="font-bold text-[#24140E] dark:text-stone-300">{th.author.fullName}</span>
                        <Badge variant="outline" className="text-[9px] uppercase border-[#D8C7B8] dark:border-[#38241B]">
                          {th.author.role}
                        </Badge>
                        <span className="text-stone-400 text-[10px]">
                          {new Date(th.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#24140E] dark:text-white pt-1">
                        {th.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpvote(th.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors shrink-0 ${
                        th.hasUpvoted
                          ? 'bg-orange-500/10 border-orange-500/40 text-brand-orange font-bold'
                          : 'border-[#EADFD4] dark:border-[#2D1C15] text-[#6B5A4E] dark:text-stone-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <ThumbsUp className={`h-3.5 w-3.5 ${th.hasUpvoted ? 'fill-current text-brand-orange' : ''}`} />
                      <span className="font-mono">{th.upvotes}</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#6B5A4E] dark:text-stone-300 leading-relaxed">
                    {th.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#6B5A4E] dark:text-stone-400 pt-2 border-t border-[#EADFD4] dark:border-[#2D1C15]">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-brand-orange" />
                      <span>{th.repliesCount} Answers and Comments</span>
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-brand-orange hover:bg-orange-50 dark:hover:bg-orange-950/30">
                      View Discussion & Reply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INSTRUCTOR ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#19100C] border border-[#EADFD4] dark:border-[#2D1C15] space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#24140E] dark:text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-brand-orange" />
                <span>Official Campus & Academic Notices</span>
              </h3>

              <div className="divide-y divide-[#EADFD4] dark:divide-[#2D1C15]">
                <div className="py-4 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 text-[10px]">
                      Urgent Announcement
                    </Badge>
                    <span className="text-[10px] text-stone-400">November 16, 2026</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#24140E] dark:text-white">
                    Midterm Examination Timetable Published for TVET Level III & IV
                  </h4>
                  <p className="text-xs text-[#6B5A4E] dark:text-stone-300 leading-relaxed">
                    The centralized examination schedules for the Fall semester have been confirmed. Students can download their personalized exam entry slip from the Institution tab.
                  </p>
                  <span className="text-[10px] text-brand-orange block font-semibold">
                    Published by Academic Affairs Directorate • Addis Ababa Institute of Technology
                  </span>
                </div>

                <div className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-orange-500/10 text-brand-orange border border-orange-500/30 text-[10px]">
                      Revision Live Stream
                    </Badge>
                    <span className="text-[10px] text-stone-400">November 14, 2026</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#24140E] dark:text-white">
                    Live Q&A Session on Distributed Systems with Dr. Dawit Abebe
                  </h4>
                  <p className="text-xs text-[#6B5A4E] dark:text-stone-300 leading-relaxed">
                    Join this Thursday at 4:00 PM for a walkthrough of sample exam questions and assignment grading rubrics. Low-bandwidth audio recording will be made available.
                  </p>
                  <span className="text-[10px] text-brand-orange block font-semibold">
                    Published by Faculty of Computer Science
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE STUDY GROUP DIALOG */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-[#24140E] dark:text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-orange" />
              <span>Start a Peer Study Group</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B5A4E] dark:text-stone-400">
              Form a collaborative study circle for your cohort, department, or TVET trade.
            </DialogDescription>
          </DialogHeader>

          {groupFormError && (
            <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{groupFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Distributed Systems Lab Masters"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Field / Category</label>
              <select
                value={newGroupCat}
                onChange={(e) => setNewGroupCat(e.target.value as any)}
                className="w-full h-9 rounded-md border border-[#D8C7B8] dark:border-[#38241B] bg-[#FAF7F2] dark:bg-[#120B08] px-3 text-xs text-[#24140E] dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
              >
                <option value="COMPUTER_SCIENCE">Computer Science & IT</option>
                <option value="TVET">TVET Trades & Vocational</option>
                <option value="ENGINEERING">Civil & Electrical Engineering</option>
                <option value="BUSINESS">Business & Entrepreneurship</option>
                <option value="HEALTH">Health & Life Sciences</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Meeting Schedule & Frequency</label>
              <Input
                value={newGroupSchedule}
                onChange={(e) => setNewGroupSchedule(e.target.value)}
                placeholder="e.g. Every Friday @ 4:00 PM (EAT)"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Study Goals & Rules</label>
              <Textarea
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Describe what the group will study and what members should prepare..."
                rows={3}
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" variant="orange" size="sm" className="text-xs h-8 gap-1.5">
                <span>Create Group</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ASK QUESTION DIALOG */}
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <DialogContent className="bg-white dark:bg-[#19100C] border-[#EADFD4] dark:border-[#2D1C15] text-[#24140E] dark:text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-brand-orange" />
              <span>Ask the Community & Instructors</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B5A4E] dark:text-stone-400">
              Submit an academic question to receive answers from certified teachers, TAs, and peers.
            </DialogDescription>
          </DialogHeader>

          {questionFormError && (
            <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{questionFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateQuestion} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Question Title / Topic</label>
              <Input
                value={newQTitle}
                onChange={(e) => setNewQTitle(e.target.value)}
                placeholder="e.g. How does Dijkstra's algorithm handle negative cycles?"
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Detailed Question Content</label>
              <Textarea
                value={newQContent}
                onChange={(e) => setNewQContent(e.target.value)}
                placeholder="Explain the background, what you have tried, and where you need clarification..."
                rows={4}
                className="bg-[#FAF7F2] dark:bg-[#120B08] border-[#D8C7B8] dark:border-[#38241B] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" variant="orange" size="sm" className="text-xs h-8 gap-1.5">
                <Send className="h-3.5 w-3.5" />
                <span>Post Question</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
