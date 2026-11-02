import { redirect } from 'next/navigation';

export default async function TeacherCourseRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/teacher/courses/${id}/edit`);
}

