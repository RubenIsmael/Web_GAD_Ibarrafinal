// components/login/ApiEliminacion.ts - SERVICIO ESPECÍFICO PARA ELIMINACIÓN
import { ApiResponse, PaginatedResponse } from './interfaces';

export interface SolicitudEliminacion {
  id: number;
  nombre?: string;
  descripcion?: string;
  motivo?: string;
  estado: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  fechaSolicitud?: string;
  fechaProcesamiento?: string;
  solicitante?: string;
  aprobadoPor?: string;
  categoria?: string;
  email?: string;
  cedula?: string;
  telefono?: string;
  address?: string;
  observaciones?: string;
  motivoRechazo?: string;
  justification?: string;
}

export interface EstadisticasEliminacion {
  totalSolicitudes: number;
  pendientes: number;
  eliminados: number;
  rechazados: number;
  cancelados: number;
}

export interface CategoriaComercial {
  id: number;
  name: string;
}

export class ApiEliminacion {
  private readonly API_BASE_URL = 'http://34.10.172.54:8080';
  private authToken: string | null = null;

  constructor() {
    // Recuperar token de la instancia principal del ApiService si existe
    this.recuperarTokenExistente();
  }

  // *** GESTIÓN DE TOKEN ***
  
  private recuperarTokenExistente(): void {
    // Intentar recuperar token de múltiples fuentes
    const STORAGE_KEYS = ['auth_token', 'authToken', 'token'];
    
    // Prioridad: sessionStorage > localStorage
    try {
      for (const key of STORAGE_KEYS) {
        const sessionToken = sessionStorage.getItem(key);
        if (sessionToken) {
          this.authToken = sessionToken;
          console.log(`🔄 ApiEliminacion: Token recuperado desde sessionStorage (${key})`);
          return;
        }
      }
      
      for (const key of STORAGE_KEYS) {
        const localToken = localStorage.getItem(key);
        if (localToken) {
          this.authToken = localToken;
          console.log(`🔄 ApiEliminacion: Token recuperado desde localStorage (${key})`);
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ ApiEliminacion: Error recuperando token:', error);
    }
  }

  private getAuthToken(): string | null {
    if (!this.authToken) {
      this.recuperarTokenExistente();
    }
    return this.authToken;
  }

  public isAuthenticated(): boolean {
    const token = this.getAuthToken();
    if (!token) return false;
    
    // Verificar si el token no está expirado
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 ApiEliminacion: Header Authorization agregado');
    } else {
      console.warn('⚠️ ApiEliminacion: No hay token disponible');
    }

    return headers;
  }

  // *** MÉTODO GENÉRICO PARA PETICIONES ***
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.API_BASE_URL}${endpoint}`;
      
      console.log(`🌐 ApiEliminacion: Petición a: ${url}`);
      console.log(`⚙️ Método: ${options.method || 'GET'}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
        mode: 'cors',
      };

      let response: Response;
      
      try {
        response = await fetch(url, config);
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      // Procesar respuesta
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      
      try {
        const responseText = await response.text();
        
        if (responseText.trim()) {
          if (contentType.includes('application/json') || 
              responseText.trim().startsWith('{') || 
              responseText.trim().startsWith('[')) {
            data = JSON.parse(responseText);
          } else {
            data = { message: responseText };
          }
        } else {
          data = { message: 'Respuesta vacía del servidor' };
        }
      } catch (readError) {
        console.error('❌ Error leyendo respuesta:', readError);
        data = { message: 'Error al leer la respuesta del servidor' };
      }

      // Respuestas exitosas
      if (response.ok) {
        console.log('✅ Petición exitosa');
        return {
          success: true,
          data: data,
          message: data?.message || 'Operación exitosa',
          status: response.status,
        };
      }

      // Errores HTTP
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 401) {
        console.warn('🚫 Token expirado o inválido');
        return {
          success: false,
          error: 'Sesión expirada. Inicie sesión nuevamente.',
          message: 'No autorizado',
          status: response.status,
        };
      }
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        status: response.status,
      };
      
    } catch (error) {
      console.error('💥 Error en petición:', error);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'La petición tardó demasiado tiempo. Verifique su conexión.',
          message: 'Timeout de conexión',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        message: 'Error en la operación',
      };
    }
  }

  // *** MÉTODOS ESPECÍFICOS PARA ELIMINACIÓN BASADOS EN SWAGGER ***

  // Listar solicitudes de eliminación por estado
  public async getSolicitudesEliminacion(estado?: string, page: number = 0, size: number = 10): Promise<ApiResponse<SolicitudEliminacion[]>> {
    try {
      console.log(`🗑️ Obteniendo solicitudes de eliminación - Estado: ${estado || 'todos'}`);
      
      // Endpoint basado en Swagger: GET /business/deletion
      let endpoint = '/business/deletion';
      
      // Agregar parámetros si es necesario
      const params = new URLSearchParams();
      if (estado) params.append('estado', estado);
      params.append('page', page.toString());
      params.append('size', size.toString());
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const response = await this.request<SolicitudEliminacion[]>(endpoint, {
        method: 'GET'
      });

      // Si la respuesta es paginada, adaptarla
      if (response.success && response.data) {
        // Verificar si es una respuesta paginada
        if (typeof response.data === 'object' && 'content' in response.data) {
          const paginatedData = response.data as any;
          return {
            ...response,
            data: paginatedData.content || []
          };
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('💥 Error obteniendo solicitudes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener solicitudes',
        message: 'Error en la operación'
      };
    }
  }

  // Aprobar solicitud de eliminación
  public async aprobarEliminacion(solicitudId: number, justification?: string): Promise<ApiResponse<any>> {
    try {
      console.log(`✅ Aprobando eliminación: ${solicitudId}`);
      
      // Endpoint basado en Swagger: POST /business/deletion/{id}/approve
      let endpoint = `/business/deletion/${solicitudId}/approve`;
      
      // Agregar justificación como query parameter si existe
      if (justification && justification.trim()) {
        endpoint += `?justification=${encodeURIComponent(justification.trim())}`;
      }
      
      return await this.request<any>(endpoint, {
        method: 'POST'
      });
      
    } catch (error) {
      console.error('💥 Error aprobando eliminación:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al aprobar eliminación',
        message: 'Error en la operación'
      };
    }
  }

  // Rechazar solicitud de eliminación
  public async rechazarEliminacion(solicitudId: number, justification: string): Promise<ApiResponse<any>> {
    try {
      console.log(`❌ Rechazando eliminación: ${solicitudId}`);
      console.log(`📝 Justificación: ${justification.substring(0, 100)}...`);
      
      if (!justification || justification.trim().length < 10) {
        return {
          success: false,
          error: 'La justificación debe tener al menos 10 caracteres',
          message: 'Justificación requerida'
        };
      }
      
      // Endpoint basado en Swagger: POST /business/deletion/{id}/reject?justification=...
      const endpoint = `/business/deletion/${solicitudId}/reject?justification=${encodeURIComponent(justification.trim())}`;
      
      return await this.request<any>(endpoint, {
        method: 'POST'
      });
      
    } catch (error) {
      console.error('💥 Error rechazando eliminación:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al rechazar eliminación',
        message: 'Error en la operación'
      };
    }
  }

  // Obtener categorías de comercios
  public async getCategoriasComercios(): Promise<ApiResponse<CategoriaComercial[]>> {
    try {
      console.log('📋 Obteniendo categorías de comercios...');
      
      // Endpoint basado en Swagger: GET /businessCategories/select
      const endpoint = '/businessCategories/select';
      
      return await this.request<CategoriaComercial[]>(endpoint, {
        method: 'GET'
      });
      
    } catch (error) {
      console.error('💥 Error obteniendo categorías:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener categorías',
        message: 'Error en la operación'
      };
    }
  }

  // Obtener estadísticas de eliminación (simulado basado en datos disponibles)
  public async getEstadisticasEliminacion(): Promise<ApiResponse<EstadisticasEliminacion>> {
    try {
      console.log('📊 Calculando estadísticas de eliminación...');
      
      // Obtener todas las solicitudes para calcular estadísticas
      const response = await this.getSolicitudesEliminacion();
      
      if (response.success && response.data) {
        const solicitudes = response.data;
        
        const stats: EstadisticasEliminacion = {
          totalSolicitudes: solicitudes.length,
          pendientes: solicitudes.filter(s => s.estado === 'PENDING').length,
          eliminados: solicitudes.filter(s => s.estado === 'APPROVED').length,
          rechazados: solicitudes.filter(s => s.estado === 'REJECTED').length,
          cancelados: solicitudes.filter(s => s.estado === 'CANCELLED').length,
        };
        
        return {
          success: true,
          data: stats,
          message: 'Estadísticas calculadas exitosamente'
        };
      }
      
      // Si no hay datos, devolver estadísticas vacías
      return {
        success: true,
        data: {
          totalSolicitudes: 0,
          pendientes: 0,
          eliminados: 0,
          rechazados: 0,
          cancelados: 0,
        },
        message: 'No hay datos disponibles'
      };
      
    } catch (error) {
      console.error('💥 Error calculando estadísticas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al calcular estadísticas',
        message: 'Error en la operación'
      };
    }
  }

  // Obtener detalles de una solicitud específica
  public async getSolicitudEliminacion(solicitudId: number): Promise<ApiResponse<SolicitudEliminacion>> {
    try {
      console.log(`🔍 Obteniendo detalles de solicitud: ${solicitudId}`);
      
      // Nota: Este endpoint no está en el Swagger proporcionado, 
      // pero podríamos inferir que existe o usar la lista filtrada
      const endpoint = `/business/deletion/${solicitudId}`;
      
      return await this.request<SolicitudEliminacion>(endpoint, {
        method: 'GET'
      });
      
    } catch (error) {
      console.error('💥 Error obteniendo solicitud:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener solicitud',
        message: 'Error en la operación'
      };
    }
  }

  // Buscar solicitudes (implementación local)
  public async buscarSolicitudesEliminacion(query: string, estado?: string): Promise<ApiResponse<SolicitudEliminacion[]>> {
    try {
      console.log(`🔍 Buscando solicitudes con query: "${query}"`);
      
      // Obtener todas las solicitudes y filtrar localmente
      const response = await this.getSolicitudesEliminacion(estado);
      
      if (response.success && response.data) {
        const queryLower = query.toLowerCase();
        const solicitudesFiltradas = response.data.filter(solicitud => 
          (solicitud.nombre && solicitud.nombre.toLowerCase().includes(queryLower)) ||
          (solicitud.descripcion && solicitud.descripcion.toLowerCase().includes(queryLower)) ||
          (solicitud.motivo && solicitud.motivo.toLowerCase().includes(queryLower)) ||
          (solicitud.email && solicitud.email.toLowerCase().includes(queryLower)) ||
          (solicitud.cedula && solicitud.cedula.toLowerCase().includes(queryLower)) ||
          (solicitud.telefono && solicitud.telefono.toLowerCase().includes(queryLower))
        );
        
        return {
          success: true,
          data: solicitudesFiltradas,
          message: `Se encontraron ${solicitudesFiltradas.length} solicitudes`
        };
      }
      
      return response;
      
    } catch (error) {
      console.error('💥 Error en búsqueda:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error en la búsqueda',
        message: 'Error en la operación'
      };
    }
  }

  // Crear nueva solicitud (si el endpoint existe en el futuro)
  public async createSolicitudEliminacion(solicitudData: Partial<SolicitudEliminacion>): Promise<ApiResponse<SolicitudEliminacion>> {
    try {
      console.log('➕ Creando nueva solicitud de eliminación...');
      
      // Este endpoint no está en el Swagger actual, pero lo preparamos para el futuro
      const endpoint = '/business/deletion';
      
      return await this.request<SolicitudEliminacion>(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(solicitudData)
      });
      
    } catch (error) {
      console.error('💥 Error creando solicitud:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear solicitud',
        message: 'Error en la operación'
      };
    }
  }

  // Mapear estados del backend a estados de la UI
  public static mapearEstado(estadoBackend: string): 'pendiente-eliminacion' | 'eliminado' | 'rechazado-eliminacion' | 'cancelado' {
    switch (estadoBackend?.toUpperCase()) {
      case 'PENDING':
        return 'pendiente-eliminacion';
      case 'APPROVED':
        return 'eliminado';
      case 'REJECTED':
        return 'rechazado-eliminacion';
      case 'CANCELLED':
        return 'cancelado';
      default:
        return 'pendiente-eliminacion';
    }
  }

  // Mapear estados de la UI al backend
  public static mapearEstadoBackend(estadoUI: string): string {
    switch (estadoUI) {
      case 'pendiente-eliminacion':
        return 'PENDING';
      case 'eliminado':
        return 'APPROVED';
      case 'rechazado-eliminacion':
        return 'REJECTED';
      case 'cancelado':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }
}

// Instancia global del servicio
export const apiEliminacion = new ApiEliminacion();