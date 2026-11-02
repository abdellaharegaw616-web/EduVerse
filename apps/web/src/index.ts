import { EduVerseApiClient } from '@eduverse/api-client';
import { Role } from '@eduverse/shared-types';

export const apiClient = new EduVerseApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

export const initialRole = Role.STUDENT;

