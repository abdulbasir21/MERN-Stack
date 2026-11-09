export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'
    : 'http://localhost:5000/api');

export interface HealthResponse {
  data: {
    status: string;
    uptime: number;
    timestamp: string;
    database: string;
  };
}

let isInterceptorInstalled = false;

/**
 * Installs a lightweight global fetch interceptor so any 403 DEMO_RESTRICTED
 * or 429 DEMO_DAILY_CAP_REACHED / DEMO_RATE_LIMITED response from the backend
 * surfaces a clean toast notification across all modules.
 */
export function installDemoFetchInterceptor() {
  if (typeof window === 'undefined' || isInterceptorInstalled) return;
  isInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 403 || response.status === 429) {
      try {
        const cloned = response.clone();
        const body = await cloned.json();
        const code = body?.error?.code as string | undefined;
        if (
          code === 'DEMO_RESTRICTED' ||
          code === 'DEMO_DAILY_CAP_REACHED' ||
          code === 'DEMO_RATE_LIMITED'
        ) {
          window.dispatchEvent(
            new CustomEvent('crewdesk:demo-toast', {
              detail: {
                code,
                message:
                  body?.error?.message ||
                  'This action is restricted in the live demo workspace.',
              },
            })
          );
        }
      } catch {
        // Non-JSON response; ignore
      }
    }
    return response;
  };
}

if (typeof window !== 'undefined') {
  installDemoFetchInterceptor();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}
