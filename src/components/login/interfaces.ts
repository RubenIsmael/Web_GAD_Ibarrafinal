// components/login/interfaces.ts - ARCHIVO COMPLETO CON TODAS LAS EXPORTACIONES

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

// *** INTERFACE USERDATA EXPORTADA CORRECTAMENTE ***
export interface UserData {
  username: string;
  token?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
  user?: User;
}

export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

// *** INTERFACE CORREGIDA PARA LOGIN PROPS ***
export interface LoginPageProps {
  onLogin: (success: boolean, userData?: UserData) => void;
}

export type ServerStatus = 'checking' | 'connected' | 'disconnected';

// *** INTERFACES PARA COMPONENTES ***
export interface HomeProps {
  userData?: UserData;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  userData?: UserData;
}

export interface DashboardProps {
  onLogout: () => void;
  userData?: UserData;
}

// *** INTERFACES PARA PROYECTOS - MANTENIDAS ***
export interface ProyectoBase {
  nombre: string;
  descripcion: string;
  responsable?: string;
  presupuesto?: number;
  categoria?: string;
  email?: string;
  cedula?: string;
  telefono?: string;
  phone?: string;
  address?: string;
  direccion?: string;
}

export interface ProyectoAPI extends ProyectoBase {
  id: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'en-progreso' | 'completado';
  fechaEnvio?: string;
  fechaInicio?: string;
  fechaFin?: string;
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  status?: string;
  fecha_envio?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  startDate?: string;
  endDate?: string;
  responsible?: string;
  autor?: string;
  budget?: number;
  category?: string;
  cat?: string;
  correo?: string;
  mail?: string;
  identification?: string;
  identificacion?: string;
  tel?: string;
  celular?: string;
  location?: string;
}

export interface ProyectoStats {
  totalProyectos: number;
  pendientes: number;
  aprobados: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  empty: boolean;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
}