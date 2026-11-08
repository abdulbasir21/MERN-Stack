const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface HealthResponse {
  data: {
    status: string;
    uptime: number;
    timestamp: string;
    database: string;
  };
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
