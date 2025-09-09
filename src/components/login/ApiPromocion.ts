// components/login/ApiPromocion.ts - SERVICIO ESPECÍFICO PARA PROMOCIONES
import { ApiResponse, PaginatedResponse } from './interfaces';

export interface Promocion {
  id: number;
  businessId: number;
  businessName: string;
  description: string;
  promotionType: 'DESCUENTO_PORCENTAJE' | 'DESCUENTO_FIJO' | 'DOS_POR_UNO' | 'PRODUCTO_GRATIS';
  discountPercentage?: number;
  discountAmount?: number;
  originalPrice?: number;
  promotionalPrice?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  imageUrl?: string;
  logoUrl?: string;
  category?: string;
  representativeName?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromocionFiltros {
  promotionType?: string;
  businessId?: number;
  isActive?: boolean;
  category?: string;
  searchTerm?: string;
}

export interface EstadisticasPromociones {
  totalPromociones: number;
  activas: number;
  caducadas: number;
  porCategoria: { [key: string]: number };
}

// Interfaz extendida para promociones con paginación que incluye size
export interface PaginatedPromocionResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export class ApiPromocion {
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
          console.log(`🔄 ApiPromocion: Token recuperado desde sessionStorage (${key})`);
          return;
        }
      }
      
      for (const key of STORAGE_KEYS) {
        const localToken = localStorage.getItem(key);
        if (localToken) {
          this.authToken = localToken;
          console.log(`🔄 ApiPromocion: Token recuperado desde localStorage (${key})`);
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ ApiPromocion: Error recuperando token:', error);
    }
  }

  public setToken(token: string): void {
    this.authToken = token;
    try {
      sessionStorage.setItem('auth_token', token);
      console.log('✅ ApiPromocion: Token establecido');
    } catch (error) {
      console.warn('⚠️ Error guardando token:', error);
    }
  }

  public getCurrentToken(): string | null {
    if (!this.authToken) {
      this.recuperarTokenExistente();
    }
    return this.authToken;
  }

  public isAuthenticated(): boolean {
    const token = this.getCurrentToken();
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

  public isTokenExpired(): boolean {
    const token = this.getCurrentToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp <= currentTime;
    } catch (error) {
      console.error('Error verificando expiración token:', error);
      return true;
    }
  }

  public clearToken(): void {
    this.authToken = null;
    try {
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      console.log('🗑️ ApiPromocion: Token eliminado');
    } catch (error) {
      console.warn('⚠️ Error eliminando token:', error);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };

    const token = this.getCurrentToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 ApiPromocion: Header Authorization agregado');
    } else {
      console.warn('⚠️ ApiPromocion: No hay token disponible');
    }

    return headers;
  }

  // *** MÉTODO GENÉRICO PARA PETICIONES ***
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.API_BASE_URL}${endpoint}`;
      
      console.log(`🌐 ApiPromocion: Petición a: ${url}`);
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

  // *** MÉTODOS ESPECÍFICOS PARA PROMOCIONES ***

  /**
   * Obtener todas las promociones públicas (activas)
   */
  public async obtenerPromocionesPublicas(filtros?: PromocionFiltros): Promise<ApiResponse<Promocion[]>> {
    try {
      console.log('📋 Obteniendo promociones públicas...');
      
      const params = new URLSearchParams();
      if (filtros?.promotionType) {
        params.append('promotionType', filtros.promotionType);
      }
      
      const queryString = params.toString();
      const endpoint = `/promotions/business/public${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.request<any>(endpoint, {
        method: 'GET'
      });

      if (response.success && response.data) {
        // Transformar los datos del backend al formato esperado
        const promociones = this.transformarPromocionesBackend(response.data);
        
        // Aplicar filtros adicionales del frontend
        let promocionesFiltradas = promociones;
        
        if (filtros?.isActive !== undefined) {
          promocionesFiltradas = promocionesFiltradas.filter(p => 
            this.isPromocionActiva(p) === filtros.isActive
          );
        }
        
        if (filtros?.searchTerm) {
          const term = filtros.searchTerm.toLowerCase();
          promocionesFiltradas = promocionesFiltradas.filter(p =>
            p.businessName.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            (p.category && p.category.toLowerCase().includes(term))
          );
        }
        
        return {
          ...response,
          data: promocionesFiltradas
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo promociones públicas:', error);
      return {
        success: false,
        error: 'Error al obtener promociones públicas',
        message: 'Error en la operación'
      };
    }
  }

  /**
   * Obtener promociones privadas por ID de negocio
   */
  public async obtenerPromocionesPorNegocio(businessId: number): Promise<ApiResponse<Promocion[]>> {
    try {
      console.log(`📋 Obteniendo promociones del negocio ${businessId}...`);
      
      const response = await this.request<any>(`/promotions/business/private?businessId=${businessId}`, {
        method: 'GET'
      });

      if (response.success && response.data) {
        const promociones = this.transformarPromocionesBackend(response.data);
        return {
          ...response,
          data: promociones
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo promociones del negocio:', error);
      return {
        success: false,
        error: 'Error al obtener promociones del negocio',
        message: 'Error en la operación'
      };
    }
  }

  /**
   * Buscar promociones con filtros dinámicos
   */
  public async buscarPromociones(filtros: PromocionFiltros, page: number = 0, size: number = 20): Promise<ApiResponse<PaginatedPromocionResponse<Promocion>>> {
    try {
      console.log('🔍 Buscando promociones con filtros...', filtros);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('size', size.toString());
      
      if (filtros.promotionType) params.append('promotionType', filtros.promotionType);
      if (filtros.businessId) params.append('businessId', filtros.businessId.toString());
      if (filtros.category) params.append('category', filtros.category);
      if (filtros.searchTerm) params.append('search', filtros.searchTerm);
      
      const response = await this.request<any>(`/promotions/business/public/search?${params.toString()}`, {
        method: 'GET'
      });

      if (response.success && response.data) {
        // Si el backend devuelve datos paginados
        if (response.data.content) {
          const promociones = this.transformarPromocionesBackend(response.data.content);
          
          // Aplicar filtro de estado activo/caducado en el frontend
          let promocionesFiltradas = promociones;
          if (filtros.isActive !== undefined) {
            promocionesFiltradas = promocionesFiltradas.filter(p => 
              this.isPromocionActiva(p) === filtros.isActive
            );
          }
          
          return {
            ...response,
            data: {
              content: promocionesFiltradas,
              totalElements: response.data.totalElements || promocionesFiltradas.length,
              totalPages: response.data.totalPages || Math.ceil(promocionesFiltradas.length / size),
              size: response.data.size || size,
              number: response.data.number || page,
              first: response.data.first || page === 0,
              last: response.data.last || false
            }
          };
        } else {
          // Si el backend devuelve un array simple
          const promociones = this.transformarPromocionesBackend(response.data);
          let promocionesFiltradas = promociones;
          
          if (filtros.isActive !== undefined) {
            promocionesFiltradas = promocionesFiltradas.filter(p => 
              this.isPromocionActiva(p) === filtros.isActive
            );
          }
          
          const startIndex = page * size;
          const endIndex = startIndex + size;
          const promocionesPaginadas = promocionesFiltradas.slice(startIndex, endIndex);
          
          return {
            ...response,
            data: {
              content: promocionesPaginadas,
              totalElements: promocionesFiltradas.length,
              totalPages: Math.ceil(promocionesFiltradas.length / size),
              size: size,
              number: page,
              first: page === 0,
              last: endIndex >= promocionesFiltradas.length
            }
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error buscando promociones:', error);
      return {
        success: false,
        error: 'Error al buscar promociones',
        message: 'Error en la operación'
      };
    }
  }

  /**
   * Crear nueva promoción
   */
  public async crearPromocion(promocion: Partial<Promocion>): Promise<ApiResponse<Promocion>> {
    try {
      console.log('➕ Creando nueva promoción...', promocion);
      
      const response = await this.request<any>('/promotions/business/create', {
        method: 'POST',
        body: JSON.stringify(promocion)
      });

      if (response.success && response.data) {
        const promocionCreada = this.transformarPromocionBackend(response.data);
        return {
          ...response,
          data: promocionCreada
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error creando promoción:', error);
      return {
        success: false,
        error: 'Error al crear promoción',
        message: 'Error en la operación'
      };
    }
  }

  /**
   * Actualizar promoción existente
   */
  public async actualizarPromocion(promoId: number, promocion: Partial<Promocion>): Promise<ApiResponse<Promocion>> {
    try {
      console.log(`📝 Actualizando promoción ${promoId}...`, promocion);
      
      const response = await this.request<any>(`/promotions/business/update/${promoId}`, {
        method: 'PUT',
        body: JSON.stringify(promocion)
      });

      if (response.success && response.data) {
        const promocionActualizada = this.transformarPromocionBackend(response.data);
        return {
          ...response,
          data: promocionActualizada
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error actualizando promoción:', error);
      return {
        success: false,
        error: 'Error al actualizar promoción',
        message: 'Error en la operación'
      };
    }
  }

  // *** MÉTODOS AUXILIARES ***

  /**
   * Verificar si una promoción está activa basado en fechas
   */
  public isPromocionActiva(promocion: Promocion): boolean {
    const fechaActual = new Date();
    const fechaInicio = new Date(promocion.startDate);
    const fechaFin = new Date(promocion.endDate);
    
    return promocion.isActive && 
           fechaActual >= fechaInicio && 
           fechaActual <= fechaFin;
  }

  /**
   * Transformar datos del backend al formato esperado por el frontend
   */
  private transformarPromocionesBackend(data: any): Promocion[] {
    if (!data) return [];
    
    const promociones = Array.isArray(data) ? data : [data];
    
    return promociones.map(item => this.transformarPromocionBackend(item));
  }

  /**
   * Transformar una promoción individual del backend
   */
  private transformarPromocionBackend(item: any): Promocion {
    return {
      id: item.id || item.promotionId || 0,
      businessId: item.businessId || item.business?.id || 0,
      businessName: item.businessName || item.business?.commercialName || item.business?.name || 'Negocio sin nombre',
      description: item.description || item.promotionDescription || '',
      promotionType: item.promotionType || 'DESCUENTO_PORCENTAJE',
      discountPercentage: item.discountPercentage || item.discount || 0,
      discountAmount: item.discountAmount || 0,
      originalPrice: item.originalPrice || item.price || 0,
      promotionalPrice: item.promotionalPrice || item.finalPrice || 0,
      startDate: item.startDate || item.startTime || item.fechaInicio || new Date().toISOString(),
      endDate: item.endDate || item.endTime || item.fechaFin || new Date().toISOString(),
      isActive: item.isActive !== undefined ? item.isActive : item.active !== undefined ? item.active : true,
      imageUrl: item.imageUrl || item.image || item.promotionImage || null,
      logoUrl: item.logoUrl || item.business?.logoUrl || item.business?.logo || null,
      category: item.category || item.business?.category?.name || item.business?.categoryName || 'General',
      representativeName: item.representativeName || item.business?.representativeName || '',
      phone: item.phone || item.business?.phone || '',
      email: item.email || item.business?.email || '',
      address: item.address || item.business?.address || '',
      createdAt: item.createdAt || item.createdDate || new Date().toISOString(),
      updatedAt: item.updatedAt || item.modifiedDate || new Date().toISOString()
    };
  }

  /**
   * Obtener estadísticas de promociones
   */
  public async obtenerEstadisticas(): Promise<ApiResponse<EstadisticasPromociones>> {
    try {
      const response = await this.obtenerPromocionesPublicas();
      
      if (response.success && response.data) {
        const promociones = response.data;
        
        const stats: EstadisticasPromociones = {
          totalPromociones: promociones.length,
          activas: promociones.filter(p => this.isPromocionActiva(p)).length,
          caducadas: promociones.filter(p => !this.isPromocionActiva(p)).length,
          porCategoria: {}
        };
        
        // Contar por categoría
        promociones.forEach(p => {
          const categoria = p.category || 'Sin categoría';
          stats.porCategoria[categoria] = (stats.porCategoria[categoria] || 0) + 1;
        });
        
        return {
          success: true,
          data: stats,
          message: 'Estadísticas obtenidas exitosamente'
        };
      }
      
      return {
        success: false,
        error: 'No se pudieron obtener las estadísticas',
        message: 'Error obteniendo datos'
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: 'Error al obtener estadísticas',
        message: 'Error en la operación'
      };
    }
  }
}

// Instancia global
export const apiPromocion = new ApiPromocion();