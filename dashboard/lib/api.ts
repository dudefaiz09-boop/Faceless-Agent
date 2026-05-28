const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string>) } });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; refresh_token: string }>("/api/v1/auth/login", {
        method: "POST", body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, display_name: string) =>
      request<{ access_token: string; refresh_token: string }>("/api/v1/auth/register", {
        method: "POST", body: JSON.stringify({ email, password, display_name }),
      }),
    me: () => request<any>("/api/v1/auth/me"),
  },
  niches: {
    list: () => request<any[]>("/api/v1/niches/"),
    create: (data: any) =>
      request<any>("/api/v1/niches/", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/api/v1/niches/${id}`),
    update: (id: string, data: any) =>
      request<any>(`/api/v1/niches/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/niches/${id}`, { method: "DELETE" }),
  },
  trends: {
    list: (nicheId?: string) => request<any[]>(`/api/v1/trends/${nicheId ? `?niche_id=${nicheId}` : ""}`),
    research: (nicheId?: string) =>
      request<any[]>("/api/v1/trends/research", {
        method: "POST", body: JSON.stringify({ niche_id: nicheId }),
      }),
    delete: (id: string) => request<void>(`/api/v1/trends/${id}`, { method: "DELETE" }),
  },
  ideas: {
    list: (params?: { status?: string; niche_id?: string; trend_id?: string }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set("status", params.status);
      if (params?.niche_id) sp.set("niche_id", params.niche_id);
      if (params?.trend_id) sp.set("trend_id", params.trend_id);
      const qs = sp.toString();
      return request<any[]>(`/api/v1/ideas/${qs ? `?${qs}` : ""}`);
    },
    generate: (trendId?: string) =>
      request<any[]>("/api/v1/ideas/generate", {
        method: "POST", body: JSON.stringify({ trend_id: trendId }),
      }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/api/v1/ideas/${id}/status`, {
        method: "PATCH", body: JSON.stringify({ status }),
      }),
    delete: (id: string) => request<void>(`/api/v1/ideas/${id}`, { method: "DELETE" }),
  },
  scripts: {
    list: (ideaId?: string) => request<any[]>(`/api/v1/scripts/${ideaId ? `?idea_id=${ideaId}` : ""}`),
    generate: (ideaId: string, durationSeconds?: number) =>
      request<any>("/api/v1/scripts/generate", {
        method: "POST", body: JSON.stringify({ idea_id: ideaId, duration_seconds: durationSeconds }),
      }),
    get: (id: string) => request<any>(`/api/v1/scripts/${id}`),
  },
};
