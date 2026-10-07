/**
 * API Service for communicating with Laravel Backend
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

  // ================= Reverts =================
  reverts = {
    getAll: () => this.request<any[]>('/reverts'),
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
  };

  // ================= Members =================
  members = {
    getAll: () => this.request<any[]>('/members'),
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
    getAll: () => this.request<any[]>('/events'),
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

  // ================= Tasks =================
  tasks = {
    getAll: () => this.request<any[]>('/tasks'),
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
    getAll: () => this.request<any[]>('/campaigns'),
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
    getAll: () => this.request<any[]>('/donations'),
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
    getAll: () => this.request<any[]>('/leaves'),
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
    getAll: (params?: { targetUserId?: string; cycle?: string }) => {
      const search = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return this.request<any[]>(`/evaluations${search}`);
    },
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
    getAll: () => this.request<any[]>('/users'),
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

