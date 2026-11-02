import { redirect } from 'next/navigation';

export default async function TeacherCourseLessonsRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/teacher/courses/${id}/sections`);
}

