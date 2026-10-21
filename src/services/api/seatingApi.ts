import type { SeatingApiResponse, SearchBy } from '@/types/allocation';
import { normalizeRegisterNumber, normalizeStudentId } from '@/utils/studentId';

const DEFAULT_BASE_URL = 'https://zedswevenbackend-production.up.railway.app';

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BASE_URL;
}

export interface SearchParams {
  query: string;
  searchBy?: SearchBy;
  testDate?: string;
  timeoutMs?: number;
}

/**
 * Normalizes query string based on the chosen search mode.
 * - For Student ID: ensures 'Z' prefix (e.g. 11586 -> Z11586).
 * - For Registration Number: trims leading/trailing spaces.
 */
export function normalizeSearchQuery(query: string, searchBy: SearchBy = 'registerNumber'): string {
  const trimmed = query.trim();
  if (!trimmed) return '';
  if (searchBy === 'studentId') {
    return normalizeStudentId(trimmed);
  }
  return normalizeRegisterNumber(trimmed);
}

/**
 * Searches the backend API for a student's seating allotment by Student ID or Registration Number.
 */
export async function searchSeatingAllotment(params: SearchParams): Promise<SeatingApiResponse> {
  const { query, searchBy = 'registerNumber', testDate, timeoutMs = 12000 } = params;
  const normalized = normalizeSearchQuery(query, searchBy);

  if (!normalized) {
    return {
      success: false,
      message: 'Please enter a valid Student ID or Registration Number.',
      data: null,
    };
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const url = new URL(`${baseUrl}/api/seating-allotment/search`);
  url.searchParams.set('query', normalized);
  if (testDate && testDate.trim()) {
    url.searchParams.set('testDate', testDate.trim());
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    const json = (await response.json().catch(() => null)) as SeatingApiResponse | null;

    if (json && typeof json === 'object') {
      return {
        success: Boolean(json.success),
        message: typeof json.message === 'string' ? json.message : response.statusText,
        data: json.data ?? null,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: `Server returned error (${response.status}: ${response.statusText})`,
        data: null,
      };
    }

    return {
      success: false,
      message: 'Unexpected response from seating allotment service.',
      data: null,
    };
  } catch (error: unknown) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'The search request timed out. Please verify your connection and try again.',
        data: null,
      };
    }

    return {
      success: false,
      message: 'Unable to connect to the seating allotment server. Check your network connection.',
      data: null,
    };
  }
}
