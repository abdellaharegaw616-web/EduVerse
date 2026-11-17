'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@/context/i18n-context';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export function LanguageSwitcher({ className, showIcon = true }: LanguageSwitcherProps) {
  const { language, setLanguage } = useI18n();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'am' : 'en');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-brand-border bg-white dark:bg-stone-900 dark:border-stone-800 text-xs font-semibold text-brand-coffee dark:text-stone-200 hover:border-brand-orange/40 hover:bg-orange-50/50 dark:hover:bg-stone-800 transition-all select-none',
        className,
      )}
      title={language === 'en' ? 'Switch to Amharic (አማርኛ)' : 'Switch to English'}
      aria-label="Language Switcher"
    >
      {showIcon && <Globe className="h-3.5 w-3.5 text-brand-orange" />}
      <span className="font-bold">
        {language === 'en' ? (
          <>
            <span className="text-brand-orange">EN</span>
            <span className="text-stone-400 font-normal ml-1 text-[10px]">አማ</span>
          </>
        ) : (
          <>
            <span className="text-brand-orange">አማ</span>
            <span className="text-stone-400 font-normal ml-1 text-[10px]">EN</span>
          </>
        )}
      </span>
    </button>
  );
}
