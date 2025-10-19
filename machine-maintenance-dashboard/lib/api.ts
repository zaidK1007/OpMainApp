import { AuthResponse, LoginCredentials, RegisterData } from './types';

const API_BASE_URL = 'http://localhost:3002';

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Debug logging for site creation requests
    if (endpoint === '/api/sites' && options.method === 'POST') {
      console.log('=== REQUEST METHOD DEBUG ===');
      console.log('URL:', url);
      console.log('Method:', config.method);
      console.log('Headers:', config.headers);
      console.log('Body:', config.body);
      console.log('Body type:', typeof config.body);
      console.log('============================');
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async register(data: RegisterData, token?: string): Promise<AuthResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  // System initialization methods
  async checkInitialization(): Promise<{ initialized: boolean; userCount: number }> {
    return this.request<{ initialized: boolean; userCount: number }>('/api/auth/check-initialization');
  }

  async setup(data: { name: string; email: string; password: string }): Promise<AuthResponse & { message: string }> {
    return this.request<AuthResponse & { message: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User profile and management
  async getProfile(token: string): Promise<any> {
    return this.request<any>('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async validateToken(token: string): Promise<{ valid: boolean; user: any }> {
    return this.request<{ valid: boolean; user: any }>('/api/auth/validate-token', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getSessions(token: string): Promise<any[]> {
    return this.request<any[]>('/api/auth/sessions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getAuditLogs(token: string, filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters?.userId) queryParams.append('userId', filters.userId);
    if (filters?.action) queryParams.append('action', filters.action);
    if (filters?.resource) queryParams.append('resource', filters.resource);
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const url = `/api/auth/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.request<any[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }

  // Test endpoint
  async testEndpoint(data: any): Promise<any> {
    return this.request<any>('/api/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== SITES API METHODS =====

  async getSites(token: string): Promise<any[]> {
    return this.request<any[]>('/api/sites', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createSite(token: string, data: { name: string; location: string }): Promise<any> {
    console.log('=== API SERVICE - CREATE SITE ===');
    console.log('Token:', token ? 'present' : 'missing');
    console.log('Data to send:', data);
    console.log('Data stringified:', JSON.stringify(data));
    console.log('===============================');
    
    return this.request<any>('/api/sites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateSite(token: string, id: string, data: { name: string; location: string }): Promise<any> {
    return this.request<any>(`/api/sites/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteSite(token: string, id: string): Promise<{ message: string }> {
    return this.request<any>(`/api/sites/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ===== MACHINES API METHODS =====

  async getMachines(token: string): Promise<any[]> {
    return this.request<any[]>('/api/machines', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getMachineTypes(token: string): Promise<string[]> {
    return this.request<string[]>('/api/machine-types', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createMachine(token: string, data: { 
    name: string; 
    siteId: string; 
    desiredDailyHours: number;
    status?: string;
    nextMaintenanceDate?: string;
  }): Promise<any> {
    return this.request<any>('/api/machines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateMachine(token: string, id: string, data: { 
    name: string; 
    siteId: string; 
    desiredDailyHours: number;
    status?: string;
    nextMaintenanceDate?: string;
  }): Promise<any> {
    return this.request<any>(`/api/machines/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteMachine(token: string, id: string): Promise<{ message: string }> {
    return this.request<any>(`/api/machines/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ===== OPERATION LOGS API METHODS =====

  async getOperationLogs(token: string, filters?: {
    machineId?: string;
    siteId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters?.machineId) queryParams.append('machineId', filters.machineId);
    if (filters?.siteId) queryParams.append('siteId', filters.siteId);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const url = `/api/operation-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.request<any[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createOperationLog(token: string, data: {
    machineId: string;
    date: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    engineer: string;
    operator: string;
    notOperatedReason?: string;
    maintenanceChecklistCompleted?: boolean;
    weeklyChecklistCompleted?: boolean;
  }): Promise<any> {
    return this.request<any>('/api/operation-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  // ===== MAINTENANCE TASKS API METHODS =====

  async getMaintenanceTasks(token: string, filters?: {
    machineId?: string;
    siteId?: string;
    completed?: boolean;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters?.machineId) queryParams.append('machineId', filters.machineId);
    if (filters?.siteId) queryParams.append('siteId', filters.siteId);
    if (filters?.completed !== undefined) queryParams.append('completed', filters.completed.toString());

    const url = `/api/maintenance-tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.request<any[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createMaintenanceTask(token: string, data: {
    machineId: string;
    task: string;
    priority: string;
    frequency?: string;
  }): Promise<any> {
    return this.request<any>('/api/maintenance-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateMaintenanceTask(token: string, id: string, data: {
    task?: string;
    completed?: boolean;
    completedBy?: string;
    priority?: string;
  }): Promise<any> {
    return this.request<any>(`/api/maintenance-tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteMaintenanceTask(token: string, id: string): Promise<{ message: string }> {
    return this.request<any>(`/api/maintenance-tasks/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ===== MAINTENANCE TASK TEMPLATES API METHODS =====

  async getMaintenanceTaskTemplates(token: string, filters?: {
    machineType?: string;
    frequency?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters?.machineType) queryParams.append('machineType', filters.machineType);
    if (filters?.frequency) queryParams.append('frequency', filters.frequency);

    const url = `/api/maintenance-task-templates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.request<any[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createMaintenanceTaskTemplate(token: string, data: {
    task: string;
    priority: string;
    frequency: string;
    machineType: string;
    description?: string;
  }): Promise<any> {
    return this.request<any>('/api/maintenance-task-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateMaintenanceTaskTemplate(token: string, id: string, data: {
    task?: string;
    priority?: string;
    frequency?: string;
    machineType?: string;
    description?: string;
  }): Promise<any> {
    return this.request<any>(`/api/maintenance-task-templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteMaintenanceTaskTemplate(token: string, id: string): Promise<{ message: string; tasksDeleted?: number }> {
    return this.request<{ message: string; tasksDeleted?: number }>(`/api/maintenance-task-templates/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async applyTaskTemplatesToMachine(token: string, machineId: string): Promise<any> {
    return this.request<any>(`/api/machines/${machineId}/apply-task-templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async synchronizeMachineType(token: string, machineType: string): Promise<{
    message: string;
    machinesSynchronized: number;
    tasksRemoved: number;
    tasksAdded: number;
    tasksUpdated: number;
  }> {
    return this.request<{
      message: string;
      machinesSynchronized: number;
      tasksRemoved: number;
      tasksAdded: number;
      tasksUpdated: number;
    }>(`/api/synchronize-machine-type/${encodeURIComponent(machineType)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const apiService = new ApiService(API_BASE_URL); 