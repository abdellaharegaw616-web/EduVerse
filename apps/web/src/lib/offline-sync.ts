'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';

export interface OfflineAction {
  id: string;
  type: 'LESSON_COMPLETE' | 'LESSON_UNCOMPLETE' | 'SAVE_NOTE';
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = 'eduverse_offline_queue';
const LOW_BANDWIDTH_KEY = 'eduverse_low_bandwidth_mode';
const OFFLINE_LESSONS_PREFIX = 'eduverse_cached_lesson_';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline queue:', e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue:', e);
  }
}

export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(newAction);
  saveOfflineQueue(queue);
  return newAction;
}

export function cacheLessonOffline(lessonId: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${OFFLINE_LESSONS_PREFIX}${lessonId}`, JSON.stringify({
      data,
      cachedAt: Date.now(),
    }));
  } catch (e) {
    console.warn('LocalStorage limit reached while caching lesson:', e);
  }
}

export function getCachedLesson(lessonId: string): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${OFFLINE_LESSONS_PREFIX}${lessonId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data;
  } catch (e) {
    return null;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isLowBandwidth, setIsLowBandwidthState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingCount(getOfflineQueue().length);

    const savedLowBw = localStorage.getItem(LOW_BANDWIDTH_KEY) === 'true';
    setIsLowBandwidthState(savedLowBw);

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleLowBandwidth = useCallback((enable?: boolean) => {
    setIsLowBandwidthState((prev) => {
      const next = enable !== undefined ? enable : !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOW_BANDWIDTH_KEY, String(next));
      }
      return next;
    });
  }, []);

  const syncQueue = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine || isSyncing) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const remaining: OfflineAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === 'LESSON_COMPLETE') {
          await apiClient.post(`/lessons/${action.payload.lessonId}/complete`, {});
        } else if (action.type === 'LESSON_UNCOMPLETE') {
          await apiClient.delete(`/lessons/${action.payload.lessonId}/complete`);
        } else if (action.type === 'SAVE_NOTE') {
          await apiClient.post(`/lessons/${action.payload.lessonId}/notes`, action.payload.data);
        }
      } catch (err: any) {
        // If not already resolved or network error, keep with retry count
        if (action.retries < 3) {
          remaining.push({ ...action, retries: action.retries + 1 });
        }
      }
    }

    saveOfflineQueue(remaining);
    setPendingCount(remaining.length);
    setLastSyncTime(new Date());
    setIsSyncing(false);
  }, [isSyncing]);

  return {
    isOnline,
    isLowBandwidth,
    toggleLowBandwidth,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncQueue,
  };
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  return { canInstall, installPwa };
}
