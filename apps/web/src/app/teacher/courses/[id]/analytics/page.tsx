'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CourseSpecificAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  useEffect(() => {
    if (courseId) {
      router.replace(`/teacher/analytics?courseId=${courseId}`);
    }
  }, [courseId, router]);

  return null;
}

