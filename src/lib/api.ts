import type { AnalyticsSummary, Reminder, UserProfile } from '../types';
import { isNativeApp, nativeTokenGet, nativeTokenSet } from './nativeBridge';

export const CLOUDFLARE_EDGE_URL = 'https://api.makeuperfect.in';

let memoryToken: string | null = null;
let configuredBaseUrl = '';

/**
 * Safely normalize a user-provided backend URL.
 * Allows empty string (same origin) or valid http(s):// origins only.
 */
export function normalizeServerBaseUrl(raw: string): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function setApiBaseUrl(url: string) {
  configuredBaseUrl = normalizeServerBaseUrl(url);
}

export function getApiBaseUrl(): string {
  if (configuredBaseUrl) return configuredBaseUrl;
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL;
  if (envUrl) return normalizeServerBaseUrl(envUrl);
  return '';
}

export async function hydrateAuthToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  if (isNativeApp()) {
    memoryToken = await nativeTokenGet();
  }
  return memoryToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (isNativeApp()) {
    await nativeTokenSet(token);
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    timeoutMs?: number;
    baseOverride?: string;
  } = {}
): Promise<T> {
  const base = options.baseOverride !== undefined ? normalizeServerBaseUrl(options.baseOverride) : getApiBaseUrl();
  const headers: Record<string, string> = {
    'X-Requested-With': 'reminderme-app',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = await hydrateAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);

  try {
    const res = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers,
      signal: controller.signal,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data as T;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new Error('Server timed out — working offline');
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export interface BackendHealthResult {
  ok: boolean;
  latencyMs: number;
  engine: string;
  target: string;
}

export const api = {
  ping: async (baseOverride?: string): Promise<BackendHealthResult> => {
    const target = baseOverride !== undefined ? normalizeServerBaseUrl(baseOverride) : getApiBaseUrl();
    const start = performance.now();
    const res = await apiRequest<{ ok: boolean; engine?: string; service?: string }>('/api/health', {
      timeoutMs: 4500,
      baseOverride: target,
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    return {
      ok: !!res.ok,
      latencyMs,
      engine:
        res.engine === 'cloudflare-worker-d1'
          ? 'Cloudflare Edge + D1'
          : res.engine === 'node-server'
            ? 'Node.js Server'
            : res.service || 'Cloud Backend',
      target: target || 'Same Origin',
    };
  },

  me: () =>
    apiRequest<{ user: UserProfile; reminders: Reminder[]; pushDevices: number }>('/api/me'),

  login: (payload: { email: string; password: string; tz: string }) =>
    apiRequest<{ token?: string; user: UserProfile; reminders: Reminder[] }>('/api/login', {
      method: 'POST',
      body: payload,
    }),

  signup: (payload: { name: string; email: string; password: string; tz: string; reminders: Reminder[] }) =>
    apiRequest<{ token?: string; user: UserProfile; reminders: Reminder[] }>('/api/signup', {
      method: 'POST',
      body: payload,
    }),

  logout: () => apiRequest<{ ok: boolean }>('/api/logout', { method: 'POST' }),

  saveReminders: (reminders: Reminder[]) =>
    apiRequest<{ reminders: Reminder[] }>('/api/reminders', {
      method: 'PUT',
      body: { reminders },
    }),

  markDone: (id: string, source = 'app') =>
    apiRequest<{ reminder: Reminder }>(`/api/reminders/${encodeURIComponent(id)}/done`, {
      method: 'POST',
      body: { source },
    }),

  snooze: (id: string, minutes: number, source = 'app') =>
    apiRequest<{ reminder: Reminder }>(`/api/reminders/${encodeURIComponent(id)}/snooze`, {
      method: 'POST',
      body: { minutes, source },
    }),

  sendEvents: (events: { type: string; ts: number; meta?: Record<string, unknown> }[]) =>
    apiRequest<{ stored: number }>('/api/events', {
      method: 'POST',
      body: { events },
    }),

  analytics: () => apiRequest<AnalyticsSummary>('/api/analytics'),

  adminAnalytics: () => apiRequest<AnalyticsSummary>('/api/admin/analytics'),

  pushKey: () => apiRequest<{ publicKey: string }>('/api/push/key'),

  pushSubscribe: (subscription: PushSubscriptionJSON, tz: string) =>
    apiRequest<{ devices: number }>('/api/push/subscribe', {
      method: 'POST',
      body: { subscription, tz },
    }),

  pushFcm: (token: string, platform: string, tz: string) =>
    apiRequest<{ devices: number }>('/api/push/fcm', {
      method: 'POST',
      body: { token, platform, tz },
    }),

  pushTest: (delaySec = 0) =>
    apiRequest<{ sent?: number; scheduled?: boolean; delaySec?: number }>('/api/push/test', {
      method: 'POST',
      body: { delaySec },
    }),
};
