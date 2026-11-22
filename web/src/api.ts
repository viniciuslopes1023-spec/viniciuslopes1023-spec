import type { LeadView, LeadsResponse, ScanStatus } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export const api = {
  me: () => request<{ authenticated: boolean; email: string | null }>('/api/auth/me'),
  login: (email: string, password: string) =>
    request<{ ok: boolean; email: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  leads: (view: LeadView, q: string) =>
    request<LeadsResponse>(`/api/leads?view=${view}&q=${encodeURIComponent(q)}&limit=300`),
  setStatus: (id: number, status: 'new' | 'worked' | 'ignored') =>
    request<{ ok: boolean }>(`/api/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  scanStatus: () => request<ScanStatus>('/api/scan/status'),
  startScan: () => request<{ started: boolean; reason?: string }>('/api/scan', { method: 'POST' }),
};
