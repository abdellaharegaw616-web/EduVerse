'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  Pin,
  CheckCircle2,
  Send,
  Search,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/context/i18n-context';

export interface DiscussionThread {
  id: string;
  courseId: string;
  title: string;
  content: string;
  author: {
    id: string;
    fullName: string;
    role: 'INSTRUCTOR' | 'STUDENT' | 'TA';
    avatarUrl?: string;
  };
  isPinned?: boolean;
  isSolved?: boolean;
  upvotes: number;
  hasUpvoted?: boolean;
  createdAt: string;
  replies: Array<{
    id: string;
    author: {
      fullName: string;
      role: 'INSTRUCTOR' | 'STUDENT' | 'TA';
    };
    content: string;
    isInstructorAnswer?: boolean;
    createdAt: string;
  }>;
}

interface LessonDiscussionBoardProps {
  courseId: string;
  courseTitle: string;
  lessonTitle?: string;
}

export function LessonDiscussionBoard({
  courseId,
  courseTitle,
  lessonTitle,
}: LessonDiscussionBoardProps) {
  const { lang } = useI18n();
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNANSWERED' | 'SOLVED' | 'PINNED'>('ALL');
  const [isAsking, setIsAsking] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});

  // Seed default academic discussion threads if none exist in local cache
  useEffect(() => {
    const cacheKey = `eduverse_discussions_${courseId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setThreads(JSON.parse(cached));
        return;
      }
    } catch {}

    const initialThreads: DiscussionThread[] = [
      {
        id: 'seed-1',
        courseId,
        title: 'Welcome to the Course Community & Office Hours Schedule',
        content:
          'Welcome everyone! Please post your questions regarding lectures, lab assignments, or practice quizzes here. TAs and faculty hold live weekly revision sessions every Thursday at 4:00 PM (EAT).',
        author: {
          id: 'faculty-1',
          fullName: 'Dr. Dawit Abebe',
          role: 'INSTRUCTOR',
        },
        isPinned: true,
        isSolved: false,
        upvotes: 24,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        replies: [
          {
            id: 'rep-1',
            author: { fullName: 'Marta Haile', role: 'STUDENT' },
            content: 'Thank you Dr. Dawit! Will the weekly live sessions be recorded and posted for low-bandwidth access?',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 'rep-2',
            author: { fullName: 'Dr. Dawit Abebe', role: 'INSTRUCTOR' },
            content: 'Yes! Compressed audio streams and downloadable lecture summaries are uploaded within 2 hours of each session.',
            isInstructorAnswer: true,
            createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
        ],
      },
      {
        id: 'seed-2',
        courseId,
        title: 'Clarification on Module 2 Lab Exercise & Submission Deadlines',
        content:
          'In the assignment rubric, step 3 mentions submitting code with unit tests. Are we expected to test edge cases with null inputs or just standard input vectors?',
        author: {
          id: 'student-2',
          fullName: 'Biniyam Tadesse',
          role: 'STUDENT',
        },
        isPinned: false,
        isSolved: true,
        upvotes: 11,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        replies: [
          {
            id: 'rep-3',
            author: { fullName: 'Selamawit Bekele (TA)', role: 'TA' },
            content:
              'Focus on standard test cases first. Two edge case tests are bonus points as described in the grading scheme.',
            isInstructorAnswer: true,
            createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
          },
        ],
      },
    ];

    setThreads(initialThreads);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(initialThreads));
    } catch {}
  }, [courseId]);

  const saveThreads = (updated: DiscussionThread[]) => {
    setThreads(updated);
    try {
      localStorage.setItem(`eduverse_discussions_${courseId}`, JSON.stringify(updated));
    } catch {}
  };

  const handleUpvote = (id: string) => {
    const updated = threads.map((th) => {
      if (th.id === id) {
        const nextHasUpvoted = !th.hasUpvoted;
        return {
          ...th,
          hasUpvoted: nextHasUpvoted,
          upvotes: nextHasUpvoted ? th.upvotes + 1 : th.upvotes - 1,
        };
      }
      return th;
    });
    saveThreads(updated);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newTitle.trim().length < 5) {
      setFormError(
        lang === 'am'
          ? 'እባክዎ ቢያንስ ባለ 5 ፊደላት ርዕስ ያስገቡ።'
          : 'Please provide a descriptive title (at least 5 characters).',
      );
      return;
    }
    if (!newContent.trim() || newContent.trim().length < 10) {
      setFormError(
        lang === 'am'
          ? 'እባክዎ የተሟላ ጥያቄ ወይም ሀሳብ ያቅርቡ (ቢያንስ 10 ፊደላት)።'
          : 'Please write out your question or topic in full (at least 10 characters).',
      );
      return;
    }

    const newThread: DiscussionThread = {
      id: `thread-${Date.now()}`,
      courseId,
      title: newTitle.trim(),
      content: newContent.trim(),
      author: {
        id: 'current-user',
        fullName: 'Learner (You)',
        role: 'STUDENT',
      },
      isPinned: false,
      isSolved: false,
      upvotes: 1,
      hasUpvoted: true,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    saveThreads([newThread, ...threads]);
    setNewTitle('');
    setNewContent('');
    setFormError(null);
    setIsAsking(false);
  };

  const handleAddReply = (threadId: string) => {
    const text = replyInput[threadId]?.trim();
    if (!text) return;

    const updated = threads.map((th) => {
      if (th.id === threadId) {
        return {
          ...th,
          replies: [
            ...th.replies,
            {
              id: `rep-${Date.now()}`,
              author: { fullName: 'Learner (You)', role: 'STUDENT' as const },
              content: text,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }
      return th;
    });

    saveThreads(updated);
    setReplyInput((prev) => ({ ...prev, [threadId]: '' }));
  };

  const filteredThreads = threads.filter((th) => {
    const matchesSearch =
      th.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      th.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      th.author.fullName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'PINNED') return th.isPinned;
    if (activeFilter === 'SOLVED') return th.isSolved;
    if (activeFilter === 'UNANSWERED') return th.replies.length === 0;
    return true;
  });

  return (
    <div className="bg-[#19100C] border border-[#2D1C15] rounded-xl p-5 sm:p-6 space-y-5 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D1C15] pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-orange" />
            <span>{lang === 'am' ? 'የኮርስ ውይይት እና የጥያቄ መድረክ' : 'Course Discussion & Q&A Board'}</span>
          </h3>
          <p className="text-xs text-stone-400">
            {lang === 'am'
              ? 'ከአስተማሪዎች፣ ረዳቶች እና አብረዋችሁ ከሚማሩ ተማሪዎች ጋር ይወያዩ።'
              : 'Collaborate with faculty, teaching assistants, and fellow students.'}
          </p>
        </div>

        <Button
          onClick={() => setIsAsking(!isAsking)}
          variant="orange"
          size="sm"
          className="gap-1.5 text-xs shadow-sm"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>{isAsking ? (lang === 'am' ? 'ሰርዝ' : 'Close Form') : (lang === 'am' ? 'አዲስ ጥያቄ ጠይቅ' : 'Ask a Question')}</span>
        </Button>
      </div>

      {/* Ask Question Form */}
      {isAsking && (
        <form onSubmit={handleCreatePost} className="bg-[#120B08] border border-orange-900/40 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'አዲስ ውይይት ወይም ጥያቄ ጀምር' : 'Start a Discussion or Ask a Question'}</span>
            </h4>
            <p className="text-[11px] text-stone-400">
              {lessonTitle ? `${lang === 'am' ? 'የተያያዘው ትምህርት፡' : 'Context Lesson:'} ${lessonTitle}` : courseTitle}
            </p>
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-300 block">
              {lang === 'am' ? 'ርዕስ' : 'Discussion Topic / Question Summary'}
            </label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={lang === 'am' ? 'ለምሳሌ፡ የሞጁል 2 የፈተና ጥያቄ 3 አሰራር ማብራሪያ' : 'e.g. How does the pointer arithmetic rule apply in exercise 2?'}
              className="bg-[#19100C] border-[#38241B] text-xs text-white placeholder:text-stone-500 h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-300 block">
              {lang === 'am' ? 'ዝርዝር ማብራሪያ' : 'Detailed Explanation & Code Snippet'}
            </label>
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={lang === 'am' ? 'የሚገጥማችሁን ችግር ወይም የፈለጋችሁትን ማብራሪያ እዚህ በዝርዝር ጻፉ...' : 'Describe what you tried, where you are stuck, or what you would like to discuss...'}
              rows={3}
              className="bg-[#19100C] border-[#38241B] text-xs text-white placeholder:text-stone-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAsking(false);
                setFormError(null);
              }}
              className="text-stone-400 hover:text-white text-xs h-8"
            >
              {lang === 'am' ? 'ተመለስ' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="orange"
              size="sm"
              className="text-xs h-8 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'ጥያቄውን ላክ' : 'Post Question'}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'am' ? 'ጥያቄዎችን ወይም ርዕሶችን ፈልግ...' : 'Search discussions...'}
            className="pl-8 bg-[#120B08] border-[#2D1C15] text-xs text-white placeholder:text-stone-500 h-8"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PINNED', 'SOLVED', 'UNANSWERED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors shrink-0 ${
                activeFilter === filter
                  ? 'bg-brand-orange text-white font-bold'
                  : 'bg-[#120B08] border border-[#2D1C15] text-stone-400 hover:text-stone-200'
              }`}
            >
              {filter === 'ALL' && (lang === 'am' ? 'ሁሉም' : 'All')}
              {filter === 'PINNED' && (lang === 'am' ? 'የተሰኩ' : 'Pinned')}
              {filter === 'SOLVED' && (lang === 'am' ? 'መልስ ያገኙ' : 'Solved')}
              {filter === 'UNANSWERED' && (lang === 'am' ? 'መልስ የሌላቸው' : 'Unanswered')}
            </button>
          ))}
        </div>
      </div>

      {/* Discussion List */}
      <div className="space-y-4">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-8 bg-[#120B08] border border-[#2D1C15] rounded-xl space-y-2">
            <MessageSquare className="h-6 w-6 text-stone-600 mx-auto" />
            <p className="text-xs text-stone-400">
              {lang === 'am'
                ? 'ምንም የተገኘ ውይይት የለም። አዲስ ጥያቄ በመጠየቅ ውይይቱን ጀምሩ!'
                : 'No discussions match your filter. Be the first to start a conversation!'}
            </p>
          </div>
        ) : (
          filteredThreads.map((th) => (
            <div
              key={th.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all ${
                th.isPinned
                  ? 'bg-[#1D120B] border-orange-900/60 shadow-sm'
                  : 'bg-[#120B08] border-[#2D1C15]'
              }`}
            >
              {/* Thread Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {th.isPinned && (
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-[10px] gap-1">
                        <Pin className="h-3 w-3" />
                        <span>{lang === 'am' ? 'የተሰካ' : 'Pinned'}</span>
                      </Badge>
                    )}
                    {th.isSolved && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{lang === 'am' ? 'መልስ አግኝቷል' : 'Solved'}</span>
                      </Badge>
                    )}
                    <span className="text-[11px] font-semibold text-stone-300">
                      {th.author.fullName}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-[#38241B] text-stone-400 uppercase"
                    >
                      {th.author.role}
                    </Badge>
                    <span className="text-[10px] text-stone-500">
                      {new Date(th.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white pt-1">{th.title}</h4>
                </div>

                {/* Upvote Button */}
                <button
                  type="button"
                  onClick={() => handleUpvote(th.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors shrink-0 ${
                    th.hasUpvoted
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                      : 'bg-[#19100C] border-[#2D1C15] text-stone-400 hover:text-white'
                  }`}
                  title="Upvote discussion"
                >
                  <ThumbsUp className={`h-3.5 w-3.5 ${th.hasUpvoted ? 'fill-current' : ''}`} />
                  <span className="font-mono text-[11px]">{th.upvotes}</span>
                </button>
              </div>

              {/* Thread Content */}
              <p className="text-xs text-stone-300 leading-relaxed pt-2 pb-3 whitespace-pre-line">
                {th.content}
              </p>

              {/* Replies Section */}
              <div className="border-t border-[#2D1C15] pt-3 space-y-2.5">
                {th.replies.length > 0 && (
                  <div className="space-y-2 pl-2 sm:pl-4 border-l-2 border-[#2D1C15]">
                    {th.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className={`p-3 rounded-lg text-xs space-y-1 ${
                          rep.isInstructorAnswer
                            ? 'bg-orange-950/20 border border-orange-900/40 text-orange-200'
                            : 'bg-[#19100C] text-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span>{rep.author.fullName}</span>
                            {rep.isInstructorAnswer && (
                              <Badge className="bg-orange-500/30 text-orange-200 border-none text-[9px]">
                                {lang === 'am' ? 'የአስተማሪ መልስ' : 'Verified Instructor Answer'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-500">
                            {new Date(rep.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{rep.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={replyInput[th.id] || ''}
                    onChange={(e) =>
                      setReplyInput((prev) => ({ ...prev, [th.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddReply(th.id);
                      }
                    }}
                    placeholder={
                      lang === 'am'
                        ? 'መልስ ወይም ማብራሪያ ይጻፉ...'
                        : 'Write a helpful reply or suggestion...'
                    }
                    className="bg-[#19100C] border-[#38241B] text-xs text-white placeholder:text-stone-500 h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="orange"
                    onClick={() => handleAddReply(th.id)}
                    disabled={!replyInput[th.id]?.trim()}
                    className="h-8 px-3 text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
