// ScopeSentry Unified API Client

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

let inMemoryCsrfToken = null;

export function setCsrfToken(token) {
  inMemoryCsrfToken = token;
}

export function getCsrfToken() {
  return inMemoryCsrfToken;
}

export async function fetchCsrfToken() {
  try {
    const res = await fetch(`${BASE_URL}/auth/csrf`, {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.csrfToken) {
        setCsrfToken(data.data.csrfToken);
        return data.data.csrfToken;
      }
    }
  } catch (err) {
    console.warn('[API Client] Could not fetch CSRF token:', err.message);
  }
  return null;
}

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Add CSRF token for mutating requests if available
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && inMemoryCsrfToken) {
    headers.set('X-CSRF-Token', inMemoryCsrfToken);
  }

  // Set Content-Type to JSON unless uploading FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  const response = await fetch(url, config);

  // Parse JSON response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorPayload = typeof data === 'object' && data?.error
      ? data.error
      : { code: 'API_ERROR', message: data || response.statusText };
    const err = new Error(errorPayload.message || 'API request failed');
    err.code = errorPayload.code;
    err.status = response.status;
    err.details = errorPayload.details;
    throw err;
  }

  return data;
}
