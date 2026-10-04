import { auth } from '../lib/firebase/config';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export interface ReportCreate {
  report_type: 'lost' | 'found';
  item_category?: string;
  description?: string;
  location?: string;
  image_reference?: string;
}

export interface RetrievalQuery {
  image?: string;
  text?: string;
  top_k?: number;
}

export interface RetrievalResultItem {
  item_instance_id: string;
  similarity_score: number;
  rank: number;
  report_id?: string;
  report_type?: string;
  item_category?: string;
  location?: string;
  image_reference?: string;
  status?: string;
}

export interface RetrievalResult {
  model_version: string;
  results: RetrievalResultItem[];
}

const getHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface ReportOut {
  report_id: string;
  report_type: 'lost' | 'found';
  item_category?: string;
  description?: string;
  image_reference?: string;
  attributes?: any;
  location?: string;
  user_id?: string;
  item_instance_id?: string;
  status: string;
  created_at: string;
}

export const api = {
  createReport: async (data: ReportCreate) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  search: async (query: RetrievalQuery): Promise<RetrievalResult> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/retrieval/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getUserReports: async (): Promise<ReportOut[]> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/users/me/reports`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAllReports: async (): Promise<ReportOut[]> => {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getReport: async (id: string): Promise<ReportOut> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createClaim: async (data: { report_id: string, proof_text: string }) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/claims`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteReport: async (id: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
    // 204 No Content doesn't have a JSON body
    if (res.status === 204) return true;
    return res.json();
  },
  
  // Admin endpoints
  getAdminOverview: async () => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/overview`, { method: 'GET', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAdminClaims: async (status?: string) => {
    const headers = await getHeaders();
    const url = status ? `${API_BASE}/admin/claims?status=${status}` : `${API_BASE}/admin/claims`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateAdminClaim: async (id: string, status: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/claims/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAdminCandidates: async (status?: string, uncertain?: boolean) => {
    const headers = await getHeaders();
    let url = `${API_BASE}/admin/candidates?`;
    if (status) url += `status=${status}&`;
    if (uncertain) url += `uncertain=true`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateAdminCandidate: async (id: string, status: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/candidates/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAdminReports: async (type?: string) => {
    const headers = await getHeaders();
    const url = type ? `${API_BASE}/admin/reports?report_type=${type}` : `${API_BASE}/admin/reports`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAdminItems: async (resolved?: boolean) => {
    const headers = await getHeaders();
    let url = `${API_BASE}/admin/items`;
    if (resolved !== undefined) url += `?resolved=${resolved}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getReportMatches: async (reportId: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/reports/${reportId}/matches`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

