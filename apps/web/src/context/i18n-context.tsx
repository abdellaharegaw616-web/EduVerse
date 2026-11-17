'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'am';

export interface Translations {
  // Navigation & Brand
  tagline: string;
  home: string;
  courses: string;
  instructors: string;
  pricing: string;
  about: string;
  contact: string;
  dashboard: string;
  studio: string;
  admin: string;
  institutionPortal: string;
  signIn: string;
  signOut: string;
  getStarted: string;

  // Student Workspace
  studentWorkspace: string;
  myCourses: string;
  aiStudyTutor: string;
  studyNotebook: string;
  learningProgress: string;
  recentLessons: string;
  assignments: string;
  quizHistory: string;
  certificates: string;
  notifications: string;
  studentProfile: string;
  accountSettings: string;
  learningCommunity: string;
  studyGroups: string;

  // AI Study Assistant (Phase 2)
  explainSimply: string;
  explainSimplyDesc: string;
  practiceQuestions: string;
  practiceQuestionsDesc: string;
  lessonSummary: string;
  lessonSummaryDesc: string;
  assignmentHints: string;
  assignmentHintsDesc: string;
  queriesRemaining: string;
  sendQuestion: string;
  askPlaceholder: string;

  // Low Bandwidth & Offline (Phase 2)
  lowBandwidthMode: string;
  lowBandwidthActive: string;
  lowBandwidthDesc: string;
  audioOnlyMode: string;
  videoStream: string;
  downloadOfflinePacket: string;
  offlineReady: string;
  offlineNotice: string;
  syncComplete: string;

  // Institution / TVET (Phase 3)
  universityTvetManagement: string;
  departments: string;
  cohortsClasses: string;
  attendanceTracker: string;
  academicReports: string;
  facultyMembers: string;
  enrolledStudents: string;
  strictDataSeparation: string;

  // Community (Phase 3)
  courseDiscussion: string;
  askQuestion: string;
  instructorAnnouncements: string;
  studyGroupHub: string;
  joinGroup: string;
  createGroup: string;
  replies: string;
  pinnedNotice: string;

  // Common Actions & Badges
  freeAndOpen: string;
  enrollNow: string;
  continueLearning: string;
  completed: string;
  inProgress: string;
  save: string;
  cancel: string;
  search: string;
}

const DICTIONARIES: Record<Language, Translations> = {
  en: {
    // Navigation & Brand
    tagline: 'Learn Beyond Boundaries',
    home: 'Home',
    courses: 'Courses',
    instructors: 'Instructors',
    pricing: 'Pricing',
    about: 'About',
    contact: 'Contact',
    dashboard: 'Dashboard',
    studio: 'Studio',
    admin: 'Admin',
    institutionPortal: 'Institution Portal',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    getStarted: 'Get Started',

    // Student Workspace
    studentWorkspace: 'Student Academic Workspace',
    myCourses: 'My Courses',
    aiStudyTutor: 'AI Study Tutor',
    studyNotebook: 'Study Notebook',
    learningProgress: 'Learning Progress',
    recentLessons: 'Recent Lessons',
    assignments: 'Assignments',
    quizHistory: 'Quiz History',
    certificates: 'Certificates',
    notifications: 'Notifications',
    studentProfile: 'Student Profile',
    accountSettings: 'Account Settings',
    learningCommunity: 'Learning Community',
    studyGroups: 'Study Groups',

    // AI Study Assistant
    explainSimply: 'Explain Simply',
    explainSimplyDesc: 'Break down difficult concepts and academic theories into plain English with everyday analogies.',
    practiceQuestions: 'Practice Questions',
    practiceQuestionsDesc: 'Generate grounded multiple-choice practice questions strictly based on approved course material.',
    lessonSummary: 'Lesson Summary',
    lessonSummaryDesc: 'Concise summary of key definitions, core formulas, and revision checklists.',
    assignmentHints: 'Assignment Hints',
    assignmentHintsDesc: 'Progressive Socratic hints to guide your solution without giving away direct answers.',
    queriesRemaining: 'queries remaining today',
    sendQuestion: 'Send Question',
    askPlaceholder: 'Ask a conceptual question, request an example, or outline a study plan...',

    // Low Bandwidth & Offline
    lowBandwidthMode: 'Low-Bandwidth Mode',
    lowBandwidthActive: 'Low-Bandwidth Mode Active',
    lowBandwidthDesc: 'Optimized for Ethiopian 2G/3G telecom networks with reduced payload and compressed assets.',
    audioOnlyMode: 'Audio-Only Lecture',
    videoStream: 'HD Video Lecture',
    downloadOfflinePacket: 'Download Offline Packet (PDF + Slides)',
    offlineReady: 'Saved for Offline Revision',
    offlineNotice: 'You are currently working offline. Checkpoints are cached locally and will sync on reconnect.',
    syncComplete: 'Offline progress synced successfully with cloud!',

    // Institution / TVET
    universityTvetManagement: 'University & TVET Management',
    departments: 'Academic Departments',
    cohortsClasses: 'Cohorts & Class Groups',
    attendanceTracker: 'Attendance Tracker',
    academicReports: 'Academic Performance Reports',
    facultyMembers: 'Faculty Members',
    enrolledStudents: 'Enrolled Learners',
    strictDataSeparation: 'Multi-Tenant Data Isolation Enforced',

    // Community
    courseDiscussion: 'Course Discussion Board',
    askQuestion: 'Ask Community Question',
    instructorAnnouncements: 'Faculty Announcements',
    studyGroupHub: 'Peer Study Groups',
    joinGroup: 'Join Study Group',
    createGroup: 'Form New Study Group',
    replies: 'replies',
    pinnedNotice: 'Pinned Faculty Notice',

    // Common Actions & Badges
    freeAndOpen: 'Free & Open',
    enrollNow: 'Enroll in Course',
    continueLearning: 'Continue Learning',
    completed: 'Completed',
    inProgress: 'In Progress',
    save: 'Save Changes',
    cancel: 'Cancel',
    search: 'Search...',
  },

  am: {
    // Navigation & Brand
    tagline: 'ድንበር የለሽ ትምህርት',
    home: 'መነሻ',
    courses: 'ኮርሶች',
    instructors: 'አስተማሪዎች',
    pricing: 'ዋጋዎች',
    about: 'ስለ እኛ',
    contact: 'አግኙን',
    dashboard: 'ዳሽቦርድ',
    studio: 'የአስተማሪ ስቱዲዮ',
    admin: 'አስተዳዳሪ',
    institutionPortal: 'የተቋም ፖርታል',
    signIn: 'ይግቡ',
    signOut: 'ይውጡ',
    getStarted: 'ይጀምሩ',

    // Student Workspace
    studentWorkspace: 'የተማሪ የትምህርት ገጽ',
    myCourses: 'የተመዘገብኳቸው ኮርሶች',
    aiStudyTutor: 'አይአይ አጋዥ አስተማሪ',
    studyNotebook: 'የማስታወሻ ደብተር',
    learningProgress: 'የትምህርት ሂደት',
    recentLessons: 'የቅርብ ጊዜ ትምህርቶች',
    assignments: 'የቤት ስራዎች',
    quizHistory: 'የፈተና ታሪክ',
    certificates: 'የምስክር ወረቀቶች',
    notifications: 'ማሳወቂያዎች',
    studentProfile: 'የተማሪ መገለጫ',
    accountSettings: 'የመለያ ቅንብሮች',
    learningCommunity: 'የትምህርት ማህበረሰብ',
    studyGroups: 'የጥናት ቡድኖች',

    // AI Study Assistant
    explainSimply: 'በቀላል አብራራልኝ',
    explainSimplyDesc: 'ከባድ የንድፈ ሀሳብ ርዕሶችን በግልጽ ምሳሌዎች እና በቀላል ቋንቋ ያስረዳልዎታል።',
    practiceQuestions: 'የልምምድ ጥያቄዎች',
    practiceQuestionsDesc: 'ከተፈቀደው የኮርስ ማቴሪያል ላይ የተመሰረቱ ባለብዙ ምርጫ የፈተና ጥያቄዎችን ያዘጋጃል።',
    lessonSummary: 'የትምህርቱ ማጠቃለያ',
    lessonSummaryDesc: 'ቁልፍ ቃላትን፣ ህጎችንና ለፈተና ክለሳ የሚጠቅሙ ዋና ዋና ነጥቦችን ያዘጋጃል።',
    assignmentHints: 'የስራ ፍንጭ (ሂንት)',
    assignmentHintsDesc: 'መልሱን ሳያፈስስ የማሰብ አቅምዎን የሚገነቡ አጋዥ ፍንጮችን ይሰጣል።',
    queriesRemaining: 'ዛሬ የቀሩዎት ጥያቄዎች',
    sendQuestion: 'ጥያቄ ላክ',
    askPlaceholder: 'ማንኛውንም የትምህርት ጥያቄ፣ ማብራሪያ ወይም የጥናት እቅድ እዚህ ይጠይቁ...',

    // Low Bandwidth & Offline
    lowBandwidthMode: 'ዝቅተኛ ዳታ ቆጣቢ ሞድ',
    lowBandwidthActive: 'ዳታ ቆጣቢ ሞድ በርቷል',
    lowBandwidthDesc: 'ለኢትዮጵያ 2G/3G ኔትወርክ ተስማሚ እንዲሆን ዳታ በከፍተኛ መጠን ቀንሶ ይሰራል::',
    audioOnlyMode: 'ድምፅ ብቻ (ዳታ ቆጣቢ)',
    videoStream: 'ሙሉ ቪዲዮ (ኤችዲ)',
    downloadOfflinePacket: 'ያለ ኢንተርኔት ለማንበብ አውርድ (PDF)',
    offlineReady: 'ያለ ኢንተርኔት ተቀምጧል',
    offlineNotice: 'አሁን ያለ ኢንተርኔት እየተማሩ ነው። ኢንተርኔት ሲገናኝ ውጤትዎ በራስ-ሰር ይመዘገባል::',
    syncComplete: 'ያለ ኢንተርኔት የተማሩት ትምህርት በተሳካ ሁኔታ ተመዝግቧል!',

    // Institution / TVET
    universityTvetManagement: 'የዩኒቨርሲቲ እና ቴክኒክና ሙያ (TVET) አስተዳደር',
    departments: 'የትምህርት ክፍሎች (ዲፓርትመንት)',
    cohortsClasses: 'የክፍል ምድቦች እና ቡድኖች',
    attendanceTracker: 'የተማሪዎች ክትትል (አቴንዳንስ)',
    academicReports: 'የትምህርት አፈፃፀም ሪፖርቶች',
    facultyMembers: 'የመምህራን ስብስብ',
    enrolledStudents: 'የተመዘገቡ ተማሪዎች',
    strictDataSeparation: 'የተቋማት ዳታ ደህንነትና ጥበቃ የተረጋገጠ',

    // Community
    courseDiscussion: 'የኮርሱ የውይይት መድረክ',
    askQuestion: 'ጥያቄ ለማህበረሰቡ ይጠይቁ',
    instructorAnnouncements: 'የአስተማሪው ማሳወቂያዎች',
    studyGroupHub: 'የተማሪዎች የጋራ ጥናት ቡድን',
    joinGroup: 'ቡድኑን ተቀላቀል',
    createGroup: 'አዲስ የጥናት ቡድን ፍጠር',
    replies: 'ምላሾች',
    pinnedNotice: 'የተሰከከ ዋና ማሳወቂያ',

    // Common Actions & Badges
    freeAndOpen: 'ነጻና ክፍት',
    enrollNow: 'በኮርሱ ተመዝገብ',
    continueLearning: 'ትምህርትህን ቀጥል',
    completed: 'ተጠናቋል',
    inProgress: 'በሂደት ላይ',
    save: 'ለውጦችን መዝግብ',
    cancel: 'ይቅር',
    search: 'ፈልግ...',
  },
};

interface I18nContextType {
  language: Language;
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isAmharic: boolean;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  lang: 'en',
  setLanguage: () => {},
  t: DICTIONARIES.en,
  isAmharic: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('eduverse_lang') as Language;
      if (stored === 'en' || stored === 'am') {
        setLanguageState(stored);
      }
    } catch {
      // Ignore localStorage access failures
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('eduverse_lang', lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore localStorage access failures
    }
  };

  const t = DICTIONARIES[language] || DICTIONARIES.en;

  return (
    <I18nContext.Provider
      value={{
        language,
        lang: language,
        setLanguage,
        t,
        isAmharic: language === 'am',
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
