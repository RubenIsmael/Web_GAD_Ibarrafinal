// components/login/interfaces.ts

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

export interface LoginPageProps {
  onLogin: (success: boolean, token?: string) => void;
}

export type ServerStatus = 'checking' | 'connected' | 'disconnected';

// *** INTERFACES PARA PROYECTOS - ACTUALIZADAS ***

export interface ProyectoBase {
  nombre: string;
  descripcion: string;
  responsable?: string;
  presupuesto?: number;
  categoria?: string;
  email?: string;
  cedula?: string;
  telefono?: string;
  phone?: string; // Campo alternativo
  address?: string;
  direccion?: string; // Campo alternativo
}

export interface ProyectoAPI extends ProyectoBase {
  id: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'en-progreso' | 'completado';
  fechaEnvio?: string;
  fechaInicio?: string;
  fechaFin?: string;
  // Campos adicionales que pueden venir de la API
  name?: string; // Campo alternativo para nombre
  title?: string; // Campo alternativo para nombre
  description?: string; // Campo alternativo para descripcion
  desc?: string; // Campo alternativo para descripcion
  status?: string; // Campo alternativo para estado
  fecha_envio?: string; // Campo alternativo para fechaEnvio
  fecha_inicio?: string; // Campo alternativo para fechaInicio
  fecha_fin?: string; // Campo alternativo para fechaFin
  startDate?: string; // Campo alternativo para fechaInicio
  endDate?: string; // Campo alternativo para fechaFin
  responsible?: string; // Campo alternativo para responsable
  autor?: string; // Campo alternativo para responsable
  budget?: number; // Campo alternativo para presupuesto
  category?: string; // Campo alternativo para categoria
  cat?: string; // Campo alternativo para categoria
  correo?: string; // Campo alternativo para email
  mail?: string; // Campo alternativo para email
  identification?: string; // Campo alternativo para cedula
  identificacion?: string; // Campo alternativo para cedula
  tel?: string; // Campo alternativo para telefono
  celular?: string; // Campo alternativo para telefono
  location?: string; // Campo alternativo para address
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