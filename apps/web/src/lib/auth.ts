'use client';

import { api } from './api-client';
import type { UserProfileDto } from '@esourcing/shared';

export async function login(email: string, password: string) {
  const result = await api.post<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>('/auth/login', { email, password });

  api.setToken(result.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', result.refreshToken);
    // Store access token in a cookie so Edge middleware can read it.
    // Not httpOnly so the middleware (which runs in the Edge runtime) can access it.
    // SameSite=Strict prevents CSRF; Secure is applied automatically in production by the browser.
    const maxAge = result.expiresIn ?? 3600;
    document.cookie = `access_token=${result.accessToken}; path=/; max-age=${maxAge}; SameSite=Strict`;
  }

  return result;
}

export async function getProfile(): Promise<UserProfileDto> {
  return api.get<UserProfileDto>('/auth/me');
}

export function logout() {
  api.clearToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refreshToken');
    // Clear the access_token cookie by expiring it immediately
    document.cookie = 'access_token=; path=/; max-age=0; SameSite=Strict';
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  return !!api.getToken();
}
