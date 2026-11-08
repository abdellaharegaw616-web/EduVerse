import React from 'react';
import { BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PreviewBadgeProps {
  label?: string;
  phase?: string;
}

export function PreviewBadge({
  label = 'Design Preview',
  phase = 'Phase 7B Course Engine',
}: PreviewBadgeProps) {
  return (
    <Badge
      variant="amber"
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium"
      title={`Live API integration scheduled for ${phase}`}
    >
      <BookOpen className="h-3 w-3 text-amber-600 dark:text-amber-400" />
      <span>{label}</span>
      <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 hidden sm:inline">({phase})</span>
    </Badge>
  );
}
