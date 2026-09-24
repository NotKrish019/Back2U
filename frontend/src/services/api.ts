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
}

export interface RetrievalResult {
  model_version: string;
  results: RetrievalResultItem[];
}

export const api = {
  createReport: async (data: ReportCreate) => {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  search: async (query: RetrievalQuery): Promise<RetrievalResult> => {
    const res = await fetch(`${API_BASE}/retrieval/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
