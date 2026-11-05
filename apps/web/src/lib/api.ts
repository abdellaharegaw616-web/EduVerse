import { EduVerseApiClient } from '@eduverse/api-client';

export class WebApiClient extends EduVerseApiClient {
  private isRefreshing = false;
  private refreshSubscribers: Array<(err?: any) => void> = [];

  private subscribeTokenRefresh(cb: (err?: any) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(err?: any) {
    this.refreshSubscribers.forEach((cb) => cb(err));
    this.refreshSubscribers = [];
  }

  public override async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return await super.request<T>(endpoint, options);
    } catch (error: any) {
      const isAuthExempt =
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/refresh') ||
        endpoint.includes('/auth/register') ||
        endpoint.includes('/auth/forgot-password') ||
        endpoint.includes('/auth/reset-password') ||
        endpoint.includes('/auth/verify-email');

      if (error?.statusCode === 401 && !isAuthExempt) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            await super.request('/auth/refresh', { method: 'POST' });
            this.isRefreshing = false;
            this.onRefreshed();
            return await super.request<T>(endpoint, options);
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.onRefreshed(refreshErr);
            throw error;
          }
        }

        return new Promise<T>((resolve, reject) => {
          this.subscribeTokenRefresh((refreshErr) => {
            if (refreshErr) {
              reject(error);
            } else {
              super.request<T>(endpoint, options).then(resolve).catch(reject);
            }
          });
        });
      }

      throw error;
    }
  }
}

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  }
  return process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1';
};

export const apiClient = new WebApiClient({
  baseUrl: getBaseUrl(),
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eduverse:unauthorized'));
    }
  },
});

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  profile?: {
    id?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    timezone?: string | null;
  } | null;
}
