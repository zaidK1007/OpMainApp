export interface Site {
  id: string
  name: string
  location: string
  machineCount: number
}

export interface Machine {
  id: string
  name: string
  siteId: string
  siteName: string
  status: "operational" | "under-maintenance" | "idle"
  nextMaintenanceDate: string
  lastMaintenanceDate: string
  totalHoursRun: number
  desiredDailyHours: number
}

export interface OperationLog {
  id: string
  machineId: string
  machineName: string
  date: string
  startTime: string
  endTime: string
  totalHours: number
  engineer: string
  operator: string
  notOperatedReason?: string
  maintenanceChecklistCompleted: boolean
}

export interface MaintenanceTask {
  id: string
  machineId: string
  task: string
  completed: boolean
  completedBy?: string
  completedDate?: string
  priority: "low" | "medium" | "high"
}

export interface DowntimeReason {
  reason: string
  count: number
  percentage: number
}

// Authentication types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'engineer';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'engineer';
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  createUser: (data: RegisterData) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}
