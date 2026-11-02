import type { ApiErrorResponse } from '@eduverse/shared-types';

export interface ApiClientConfig {
  baseUrl: string;
  onUnauthorized?: () => void;
}

export class EduVerseApiClient {
  private baseUrl: string;
  private onUnauthorized?: () => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.onUnauthorized = config.onUnauthorized;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Ensures HTTP-only cookies are passed
    });

    if (response.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }

    if (!response.ok) {
      let errorData: ApiErrorResponse;
      try {
        errorData = (await response.json()) as ApiErrorResponse;
      } catch {
        errorData = {
          statusCode: response.status,
          error: response.statusText,
          message: 'An unknown server error occurred',
          timestamp: new Date().toISOString(),
          path: endpoint,
        };
      }
      throw errorData;
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

