/**
 * API Service for communicating with Laravel Backend
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface QueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: any;
}

export function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 && endpoint !== '/login') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      const errorData = await response.json().catch(() => ({}));
      let message = errorData.message || `API Error: ${response.status} ${response.statusText}`;
      if (errorData.errors && typeof errorData.errors === 'object') {
        const firstKey = Object.keys(errorData.errors)[0];
        if (firstKey && Array.isArray(errorData.errors[firstKey]) && errorData.errors[firstKey].length > 0) {
          message = errorData.errors[firstKey][0];
        }
      }
      const error = new Error(message) as any;
      error.status = response.status;
      error.errors = errorData.errors;
      throw error;
    }

    return response.json();
  }

  // ================= Auth =================
  auth = {
    login: async (email: string, password: string) => {
      const res = await this.request<{ token: string; user: any }>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.token) {
        localStorage.setItem('auth_token', res.token);
      }
      return res;
    },
    logout: async () => {
      try {
        await this.request('/logout', { method: 'POST' });
      } finally {
        localStorage.removeItem('auth_token');
      }
    },
    getUser: () => this.request<any>('/user'),
    updateProfile: (data: { name?: string; email?: string; department?: string }) =>
      this.request<any>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updatePassword: (data: { current_password: string; new_password: string; new_password_confirmation: string }) =>
      this.request<{ message: string }>('/user/password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // ================= Dashboard =================
  dashboard = {
    getKpis: (params?: QueryParams, options?: RequestInit) => 
      this.request<any>(`/dashboard/kpis${toQueryString(params)}`, options),
    getStats: (params?: QueryParams, options?: RequestInit) => 
      this.request<any>(`/dashboard/stats${toQueryString(params)}`, options),
    getRevertsOverTime: (params?: QueryParams, options?: RequestInit) => 
      this.request<any>(`/dashboard/reverts-over-time${toQueryString(params)}`, options),
  };

  // ================= Reverts =================
  reverts = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/reverts${toQueryString(params)}`),
    getStats: (params?: QueryParams, options?: RequestInit) => 
      this.request<any>(`/reverts/stats${toQueryString(params)}`, options),
    getDaeyahAnalytics: (params?: QueryParams, options?: RequestInit) => 
      this.request<any>(`/reverts/daeyah-analytics${toQueryString(params)}`, options),
    get: (id: string | number) => this.request<any>(`/reverts/${id}`),
    create: (data: any) => this.request<any>('/reverts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/reverts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/reverts/${id}`, {
      method: 'DELETE',
    }),
    getNextSerial: () => this.request<{ serialNumber: string }>('/reverts/next-serial'),
    getApprovedDaeyahs: () => this.request<string[]>('/reverts/daeyahs'),
  };

  // ================= Personnel =================
  personnel = {
    getStaff: <T = any>(params?: QueryParams) => 
      this.request<any>(`/personnel/staff${toQueryString(params)}`),
    createStaff: (data: any) => this.request<any>('/personnel/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateStaff: (id: string | number, data: any) => this.request<any>(`/personnel/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteStaff: (id: string | number) => this.request<{ message: string }>(`/personnel/staff/${id}`, {
      method: 'DELETE',
    }),
    getNextStaffId: () => this.request<{ staff_id: string }>('/personnel/staff/next-id'),
    getOfficers: <T = any>(params?: QueryParams) => 
      this.request<any>(`/personnel/officers${toQueryString(params)}`),
    getMembers: <T = any>(params?: QueryParams) => 
      this.request<any>(`/personnel/members${toQueryString(params)}`),
    getVolunteers: <T = any>(params?: QueryParams) => 
      this.request<any>(`/personnel/volunteers${toQueryString(params)}`),
    getFacilitators: <T = any>() => 
      this.request<any>('/personnel/facilitators'),
  };

  // ================= Members =================
  members = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/members${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/members/${id}`),
    create: (data: any) => this.request<any>('/members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/members/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Events =================
  events = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/events${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/events/${id}`),
    create: (data: any) => this.request<any>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/events/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Notices =================
  notices = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/notices${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/notices/${id}`),
    create: (data: { title?: string; content: string; type?: 'staff_note' | 'official_notice' | 'post' | 'notice' | string; department?: string; audience?: string; is_pinned?: boolean }) =>
      this.request<any>('/notices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string | number, data: { title?: string; content?: string; type?: 'staff_note' | 'official_notice' | 'post' | 'notice' | string; department?: string; audience?: string; is_pinned?: boolean }) =>
      this.request<any>(`/notices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string | number) => this.request<{ message: string }>(`/notices/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Tasks =================
  tasks = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/tasks${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/tasks/${id}`),
    create: (data: any) => this.request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Campaigns =================
  campaigns = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/campaigns${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/campaigns/${id}`),
    create: (data: any) => this.request<any>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/campaigns/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Donations =================
  donations = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/donations${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/donations/${id}`),
    create: (data: any) => this.request<any>('/donations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/donations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/donations/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Leaves =================
  leaves = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/leaves${toQueryString(params)}`),
    get: (id: string | number) => this.request<any>(`/leaves/${id}`),
    create: (data: any) => this.request<any>('/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string | number, data: any) => this.request<any>(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/leaves/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= Peer Evaluations =================
  evaluations = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/evaluations${toQueryString(params)}`),
    create: (data: any) => this.request<any>('/evaluations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: string | number) => this.request<{ message: string }>(`/evaluations/${id}`, {
      method: 'DELETE',
    }),
  };

  // ================= System Settings =================
  settings = {
    getAll: () => this.request<Record<string, any>>('/settings'),
    get: (key: string) => this.request<any>(`/settings/${key}`),
    save: (data: { key?: string; value?: any; group?: string; settings?: Record<string, any> }) => this.request<any>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // ================= User Provisioning & Management =================
  users = {
    getAll: <T = any>(params?: QueryParams) => 
      this.request<any>(`/users${toQueryString(params)}`),
    getNextStaffId: () => this.request<{ staff_id: string }>('/users/next-id'),
    create: (data: any) => this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // ================= Uploads =================
  uploadFile = async (file: File): Promise<{ url: string; path: string; name: string }> => {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload image');
    }

    return response.json();
  };
}

export const api = new ApiService();

