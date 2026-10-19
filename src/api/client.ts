import { Candidate, CandidateCreateInput, CandidateUpdateInput, DashboardData } from '../types/candidate';

const API_BASE = '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
}

export const api = {
  // 1. POST /candidates - Add candidate
  createCandidate: (data: CandidateCreateInput): Promise<Candidate> => {
    return request<Candidate>('/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 2. GET /candidates?search= - List & search candidates
  getCandidates: (search?: string): Promise<Candidate[]> => {
    const query = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return request<Candidate[]>(`/candidates${query}`, {
      method: 'GET',
    });
  },

  // 3. PUT /candidates/{id} - Update details or stage
  updateCandidate: (id: number, data: CandidateUpdateInput): Promise<Candidate> => {
    return request<Candidate>(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 4. DELETE /candidates/{id} - Remove candidate
  deleteCandidate: (id: number): Promise<{ message: string; id: number }> => {
    return request<{ message: string; id: number }>(`/candidates/${id}`, {
      method: 'DELETE',
    });
  },

  // 5. GET /dashboard - Candidate counts per stage
  getDashboard: (): Promise<DashboardData> => {
    return request<DashboardData>('/dashboard', {
      method: 'GET',
    });
  },
};
