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
  }
};

