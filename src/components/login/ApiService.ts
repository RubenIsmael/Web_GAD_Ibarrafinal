// components/login/ApiService.ts - VERSIÓN UNIFICADA Y MEJORADA CON SOPORTE MULTIPART
import { 
  LoginRequest, 
  LoginResponse, 
  ApiResponse, 
  User, 
  ProyectoBase, 
  ProyectoAPI, 
  PaginatedResponse 
} from './interfaces';

export class ApiService {
  private readonly API_BASE_URL = 'http://34.10.172.54:8080';
  private authToken: string | null = null;

  // *** MÉTODOS DE GESTIÓN DE TOKEN MEJORADOS ***
  
  private getAuthToken(): string | null {
    // Prioridad: memoria > sessionStorage > localStorage (múltiples claves de compatibilidad)
    if (this.authToken) {
      return this.authToken;
    }

    const STORAGE_KEYS = ['auth_token', 'authToken', 'token'];

    // Intentar recuperar de sessionStorage
    try {
      for (const key of STORAGE_KEYS) {
        const sessionToken = sessionStorage.getItem(key);
        if (sessionToken) {
          this.authToken = sessionToken;
          console.log(`🔄 Token recuperado desde sessionStorage (${key})`);
          return sessionToken;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error accediendo sessionStorage:', error);
    }

    // Intentar recuperar de localStorage como respaldo
    try {
      for (const key of STORAGE_KEYS) {
        const localToken = localStorage.getItem(key);
        if (localToken) {
          this.authToken = localToken;
          console.log(`🔄 Token recuperado desde localStorage (${key})`);
          return localToken;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error accediendo localStorage:', error);
    }

    return null;
  }

  private setAuthToken(token: string): void {
    this.authToken = token;
    console.log('🔐 Token guardado exitosamente en memoria');
    console.log('🔑 Token preview:', token.substring(0, 50) + '...');
    
    // Guardar en sessionStorage (prioridad alta) usando varias claves por compatibilidad
    try {
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('authToken', token);
      sessionStorage.setItem('token', token);
      console.log('💾 Token guardado en sessionStorage (auth_token/authToken/token)');
    } catch (error) {
      console.warn('⚠️ Error guardando en sessionStorage:', error);
    }
    
    // Guardar en localStorage como respaldo
    try {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      console.log('💾 Token guardado en localStorage (auth_token/authToken/token)');
    } catch (error) {
      console.warn('⚠️ Error guardando en localStorage:', error);
    }
  }

  private clearAuthToken(): void {
    this.authToken = null;
    console.log('🗑️ Token eliminado de memoria');
    
    // Limpiar de sessionStorage
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('token');
      console.log('🗑️ Token eliminado de sessionStorage');
    } catch (error) {
      console.warn('⚠️ Error limpiando sessionStorage:', error);
    }
    
    // Limpiar de localStorage
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      console.log('🗑️ Token eliminado de localStorage');
    } catch (error) {
      console.warn('⚠️ Error limpiando localStorage:', error);
    }
  }

  // *** MÉTODOS PÚBLICOS PARA GESTIÓN DE TOKEN ***
  
  public isAuthenticated(): boolean {
    const token = this.getAuthToken();
    if (!token) {
      console.log('🔍 No hay token disponible');
      return false;
    }
    
    if (this.isTokenExpired()) {
      console.log('🔍 Token expirado');
      this.clearAuthToken();
      return false;
    }
    
    console.log('🔍 Token válido y no expirado');
    return true;
  }

  public hasValidToken(): boolean {
    return this.isAuthenticated();
  }

  public getCurrentToken(): string | null {
    return this.getAuthToken();
  }

  public setToken(token: string): void {
    this.setAuthToken(token);
  }

  public clearToken(): void {
    this.clearAuthToken();
  }

  // *** VERIFICACIÓN DE EXPIRACIÓN DE TOKEN ***
  public isTokenExpired(): boolean {
    const token = this.getAuthToken();
    if (!token) return true;
    
    try {
      // Decodificar el payload del JWT (sin validar la firma)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;
      
      if (isExpired) {
        console.log('⚠️ Token expirado');
      }
      
      return isExpired;
    } catch (error) {
      console.error('Error al verificar expiración del token:', error);
      return true;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Header Authorization agregado con token');
    } else {
      console.warn('⚠️ No hay token disponible para agregar a headers');
    }

    return headers;
  }

  // *** MÉTODO ESPECÍFICO PARA HEADERS MULTIPART ***
  private getMultipartHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
    };
    // NO incluir Content-Type para multipart/form-data - el browser lo agrega automáticamente

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Header Authorization agregado para multipart');
    } else {
      console.warn('⚠️ No hay token disponible para agregar a headers multipart');
    }

    return headers;
  }

  public async healthCheck(): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      console.log('🏥 Verificando salud del servidor...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(this.API_BASE_URL, {
          method: 'HEAD', 
          signal: controller.signal,
          headers: { 
            'Accept': '*/*',
            'Cache-Control': 'no-cache'
          },
        });
        
        clearTimeout(timeoutId);
        console.log(`✅ Servidor respondió con status: ${response.status}`);
        
        return {
          success: true,
          message: 'Servidor disponible',
          data: { status: 'ok', timestamp: new Date().toISOString() }
        };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ Error en health check:', error);
      
      let errorMessage = 'No se pudo conectar con el servidor';
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = 'Timeout de conexión';
      } else if (error instanceof TypeError) {
        errorMessage = 'Error de red o CORS';
      }
      
      return {
        success: false,
        error: errorMessage,
        message: 'Servidor no disponible'
      };
    }
  }

  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔐 Intentando login con:', credentials.username);
      
      // Validaciones básicas
      if (!credentials.username?.trim() || !credentials.password?.trim()) {
        return {
          success: false,
          message: 'Usuario y contraseña son requeridos'
        };
      }

      // *** ENDPOINT ESPECÍFICO BASADO EN LA DOCUMENTACIÓN SWAGGER ***
      const endpoint = '/auth/login';
      
      try {
        console.log(`🎯 Usando endpoint: ${this.API_BASE_URL}${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const requestBody = JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password.trim()
        });
        
        console.log('📦 Request body:', requestBody);
        
        const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: requestBody,
          signal: controller.signal,
          mode: 'cors', 
        });

        clearTimeout(timeoutId);
        console.log(`📡 ${endpoint} respondió con status: ${response.status}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

        let data: Record<string, unknown> = {};
        const contentType = response.headers.get('content-type') || '';
        
        try {
          const responseText = await response.text();
          console.log(`📄 Response text (${responseText.length} chars):`, responseText.substring(0, 500));
          
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
        } catch (parseError) {
          console.error('❌ Error parseando respuesta:', parseError);
          data = { message: 'Error al procesar respuesta del servidor' };
        }

        console.log('📊 Datos procesados:', data);
        
        if (response.ok && (response.status >= 200 && response.status < 300)) {
          console.log('✅ Login exitoso!');
          
          // *** BÚSQUEDA MEJORADA Y ESPECÍFICA DEL TOKEN JWT ***
          let token: string | undefined;
          
          // 🎯 PRIORIDAD 1: Buscar específicamente 'jwt' (según swagger)
          if (data.jwt && typeof data.jwt === 'string') {
            token = data.jwt as string;
            console.log('🔍 ¡TOKEN JWT ENCONTRADO en campo "jwt"!');
          }
          
          // 🎯 PRIORIDAD 2: Buscar en campos comunes de respuesta
          if (!token) {
            const tokenFields = [
              'token', 'accessToken', 'access_token', 'authToken', 
              'bearerToken', 'sessionToken', 'apiToken', 'authenticationToken'
            ];
            
            for (const field of tokenFields) {
              if (data[field] && typeof data[field] === 'string') {
                token = data[field] as string;
                console.log(`🔍 Token encontrado en campo '${field}'`);
                break;
              }
            }
          }
          
          // 🎯 PRIORIDAD 3: Buscar en headers
          if (!token) {
            const headerFields = [
              'Authorization', 'X-Auth-Token', 'Access-Token', 
              'X-Access-Token', 'Bearer', 'X-JWT-Token'
            ];
            
            for (const headerField of headerFields) {
              const headerValue = response.headers.get(headerField);
              if (headerValue) {
                token = headerValue.replace(/^Bearer\s+/i, '');
                console.log(`🔍 Token encontrado en header '${headerField}'`);
                break;
              }
            }
          }
          
          // 🎯 PRIORIDAD 4: Búsqueda recursiva en objetos anidados
          if (!token && typeof data === 'object') {
            const findTokenRecursive = (obj: Record<string, unknown>, depth = 0): string | undefined => {
              if (depth > 3) return undefined; // Limitar profundidad
              
              for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && (
                  key.toLowerCase().includes('token') || 
                  key.toLowerCase().includes('jwt') ||
                  key.toLowerCase() === 'jwt'
                )) {
                  return value;
                }
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  const nestedToken = findTokenRecursive(value as Record<string, unknown>, depth + 1);
                  if (nestedToken) return nestedToken;
                }
              }
              return undefined;
            };
            
            token = findTokenRecursive(data);
            if (token) {
              console.log('🔍 Token encontrado en búsqueda recursiva');
            }
          }
          
          // *** GUARDAR EL TOKEN AUTOMÁTICAMENTE SI SE ENCUENTRA ***
          if (token && token.length > 10) { // Validación básica de longitud
            this.setAuthToken(token);
            console.log('🎉 ¡TOKEN CAPTURADO Y GUARDADO AUTOMÁTICAMENTE!');
            console.log('🔑 Token completo:', token);
            
            // *** VALIDACIÓN ADICIONAL: Verificar que es un JWT válido ***
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('✅ Token JWT válido detectado');
                console.log('📋 Payload del token:', payload);
              } else {
                console.warn('⚠️ Token no parece ser un JWT válido (no tiene 3 partes)');
              }
            } catch (jwtError) {
              console.warn('⚠️ Error validando estructura JWT:', jwtError);
              // Aún así mantener el token por si es válido en el servidor
            }
            
          } else {
            console.warn('⚠️ NO SE ENCONTRÓ TOKEN VÁLIDO EN LA RESPUESTA');
            console.log('🔍 Respuesta completa para debug:', data);
            console.log('🔍 Headers completos:', Object.fromEntries(response.headers.entries()));
            
            // *** RESPUESTA EXITOSA PERO SIN TOKEN - CONTINUAR ***
            console.log('⚠️ Login exitoso pero sin token, continuando...');
          }
          
          // Extraer información del usuario
          const userData = (data.user || data.userData || data) as Record<string, unknown>;
          const user: User = {
            id: (userData.id || userData.userId || Date.now().toString()) as string,
            username: (userData.username as string) || credentials.username,
            email: (userData.email as string) || `${credentials.username}@ibarra.gob.ec`,
            role: (userData.role as string) || 'user'
          };
          
          return {
            success: true,
            token: this.getAuthToken() || undefined,
            user: user,
            message: (data.message as string) || 'Autenticación exitosa',
          };
        } else {
          const errorMessage = (data.message || data.error || `Error HTTP ${response.status}`) as string;
          console.log(`❌ Login falló: ${errorMessage}`);
          
          // Si es error de credenciales, devolver error específico
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              message: 'Credenciales incorrectas. Verifique su usuario y contraseña.',
            };
          }
          
          return {
            success: false,
            message: errorMessage,
          };
        }
        
      } catch (endpointError) {
        console.error(`💥 Error con endpoint ${endpoint}:`, endpointError);
        
        if (endpointError instanceof DOMException && endpointError.name === 'AbortError') {
          return {
            success: false,
            message: 'Timeout de conexión. Intente nuevamente.',
          };
        } else if (endpointError instanceof TypeError) {
          return {
            success: false,
            message: 'Error de red o CORS. Verifique la conexión.',
          };
        } else {
          return {
            success: false,
            message: endpointError instanceof Error ? endpointError.message : 'Error desconocido',
          };
        }
      }
      
    } catch (loginError) {
      console.error('💥 Error general de login:', loginError);
      return {
        success: false,
        message: loginError instanceof Error ? loginError.message : 'Error de conexión con el servidor',
      };
    }
  }

  // *** MÉTODO GENÉRICO PARA PETICIONES CON TOKEN ***
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.API_BASE_URL}${endpoint}`;
      
      console.log(`🌐 Petición a: ${url}`);
      console.log(`⚙️ Método: ${options.method || 'GET'}`);
      console.log(`🔑 Token presente: ${this.isAuthenticated()}`);
      
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
        credentials: 'include',
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
      
      const contentType = response.headers.get('content-type') || '';
      let data: Record<string, unknown> | null = null;
      
      try {
        const responseText = await response.text();
        
        if (responseText.trim()) {
          if (contentType.includes('application/json') || 
              responseText.trim().startsWith('{') || 
              responseText.trim().startsWith('[')) {
            try {
              data = JSON.parse(responseText);
              console.log('📊 JSON parseado exitosamente');
            } catch (parseError) {
              console.error('❌ Error parseando JSON:', parseError);
              data = { 
                message: 'Error al parsear respuesta JSON',
                rawResponse: responseText.substring(0, 200)
              };
            }
          } else {
            console.log('📝 Respuesta no es JSON');
            data = { 
              message: responseText,
              type: 'text'
            };
          }
        } else {
          console.log('📭 Respuesta vacía');
          data = { message: 'Respuesta vacía del servidor' };
        }
      } catch (readError) {
        console.error('❌ Error leyendo respuesta:', readError);
        data = { message: 'Error al leer la respuesta del servidor' };
      }

      // Manejo de respuestas exitosas
      if (response.ok) {
        console.log('✅ Petición exitosa');
        return {
          success: true,
          data: data as T,
          message: data?.message as string || 'Operación exitosa',
          status: response.status,
        };
      }

      // Manejo de errores HTTP
      const errorMessage = (data?.message || 
                          data?.error || 
                          data?.detail ||
                          `HTTP ${response.status}: ${response.statusText}`) as string;
      
      console.error(`❌ Error HTTP: ${errorMessage}`);
      
      // Manejo específico de códigos de error
      if (response.status === 401) {
        console.warn('🚫 Token expirado o inválido, limpiando...');
        this.clearAuthToken();
        return {
          success: false,
          error: 'Sesión expirada. Inicie sesión nuevamente.',
          message: 'No autorizado',
          status: response.status,
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          error: 'No tiene permisos para realizar esta operación.',
          message: 'Acceso denegado',
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
      
      if (error instanceof TypeError) {
        return {
          success: false,
          error: 'Error de red. Verifique su conexión a internet.',
          message: 'Error de conexión',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        message: 'Error en la operación',
      };
    }
  }

  // *** MÉTODO ESPECÍFICO PARA CREAR NEGOCIO CON MULTIPART/FORM-DATA ***
  public async createBusinessWithFiles(businessData: {
    // Campos obligatorios según la documentación
    categoryId: number;
    commercialName: string;
    representativeName: string;
    phone: string;
    email: string;
    parishCommunitySector: string;
    description: string;
    productsServices: string[];
    acceptsWhatsappOrders: boolean;
    deliveryService: 'SI' | 'NO';
    salePlace: 'LOCAL_FIJO' | 'AMBULANTE' | 'OTRO';
    registrationDate: string; // formato YYYY-MM-DD
    address: string;
    googleMapsCoordinates: string;
    schedules: string[];
    
    // Campos opcionales
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
    whatsappNumber?: string;
    udelSupportDetails?: string;
    receivedUdelSupport?: boolean;
  }, files: {
    logoFile?: File;
    signatureFile?: File;
    cedulaFile: File; // Obligatorio según documentación
    carrouselPhotos?: File[];
  }): Promise<ApiResponse<any>> {
    try {
      console.log('🏪 Creando negocio con archivos multipart:', {
        businessName: businessData.commercialName,
        filesCount: Object.keys(files).length
      });

      // Validaciones obligatorias
      if (!businessData.categoryId) {
        return {
          success: false,
          error: 'El categoryId es obligatorio',
          status: 400
        };
      }

      if (!businessData.commercialName?.trim()) {
        return {
          success: false,
          error: 'El nombre comercial es obligatorio',
          status: 400
        };
      }

      if (!businessData.representativeName?.trim()) {
        return {
          success: false,
          error: 'El nombre del representante es obligatorio',
          status: 400
        };
      }

      if (!files.cedulaFile) {
        return {
          success: false,
          error: 'El archivo de cédula/RUC es obligatorio',
          status: 400
        };
      }

      // Crear FormData
      const formData = new FormData();

      // Agregar datos del negocio como JSON string
      const businessJson = JSON.stringify({
        categoryId: businessData.categoryId,
        commercialName: businessData.commercialName.trim(),
        representativeName: businessData.representativeName.trim(),
        phone: businessData.phone?.trim() || '',
        email: businessData.email?.trim() || '',
        parishCommunitySector: businessData.parishCommunitySector?.trim() || '',
        description: businessData.description?.trim() || '',
        productsServices: businessData.productsServices || [],
        acceptsWhatsappOrders: businessData.acceptsWhatsappOrders || false,
        deliveryService: businessData.deliveryService || 'NO',
        salePlace: businessData.salePlace || 'LOCAL_FIJO',
        registrationDate: businessData.registrationDate || new Date().toISOString().split('T')[0],
        address: businessData.address?.trim() || '',
        googleMapsCoordinates: businessData.googleMapsCoordinates?.trim() || '',
        schedules: businessData.schedules || [],
        
        // Campos opcionales
        ...(businessData.facebook && { facebook: businessData.facebook.trim() }),
        ...(businessData.instagram && { instagram: businessData.instagram.trim() }),
        ...(businessData.tiktok && { tiktok: businessData.tiktok.trim() }),
        ...(businessData.website && { website: businessData.website.trim() }),
        ...(businessData.whatsappNumber && { whatsappNumber: businessData.whatsappNumber.trim() }),
        ...(businessData.udelSupportDetails && { udelSupportDetails: businessData.udelSupportDetails.trim() }),
        ...(businessData.receivedUdelSupport !== undefined && { receivedUdelSupport: businessData.receivedUdelSupport })
      });

      console.log('📦 Business JSON para FormData:', businessJson);
      formData.append('business', businessJson);

      // Agregar archivos
      if (files.logoFile) {
        formData.append('logoFile', files.logoFile);
        console.log('📷 Logo agregado:', files.logoFile.name);
      }

      if (files.signatureFile) {
        formData.append('signatureFile', files.signatureFile);
        console.log('✍️ Firma agregada:', files.signatureFile.name);
      }

      // Archivo de cédula (obligatorio)
      formData.append('cedulaFile', files.cedulaFile);
      console.log('🆔 Cédula agregada:', files.cedulaFile.name);

      // Fotos del carrusel (múltiples)
      if (files.carrouselPhotos && files.carrouselPhotos.length > 0) {
        files.carrouselPhotos.forEach((photo, index) => {
          formData.append('carrouselPhotos', photo);
          console.log(`🖼️ Foto carrusel ${index + 1} agregada:`, photo.name);
        });
      }

      // Realizar petición
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos para archivos

      console.log(`🌐 Enviando POST a: ${this.API_BASE_URL}/business/create`);

      try {
        const response = await fetch(`${this.API_BASE_URL}/business/create`, {
          method: 'POST',
          headers: this.getMultipartHeaders(), // Headers especiales para multipart
          body: formData,
          signal: controller.signal,
          mode: 'cors',
          credentials: 'include',
        });

        clearTimeout(timeoutId);
        console.log(`📡 Response status: ${response.status} ${response.statusText}`);

        const contentType = response.headers.get('content-type') || '';
        let responseData: Record<string, unknown> = {};

        try {
          const responseText = await response.text();
          console.log(`📄 Response text (${responseText.length} chars):`, responseText.substring(0, 500));
          
          if (responseText.trim()) {
            if (contentType.includes('application/json') || 
                responseText.trim().startsWith('{') || 
                responseText.trim().startsWith('[')) {
              responseData = JSON.parse(responseText);
            } else {
              responseData = { message: responseText };
            }
          } else {
            responseData = { message: 'Respuesta vacía del servidor' };
          }
        } catch (parseError) {
          console.error('❌ Error parseando respuesta:', parseError);
          responseData = { message: 'Error al procesar respuesta del servidor' };
        }

        if (response.ok) {
          console.log('✅ Negocio creado exitosamente');
          return {
            success: true,
            data: responseData,
            message: (responseData.message as string) || 'Negocio creado exitosamente',
            status: response.status
          };
        } else {
          const errorMessage = (responseData.message || 
                              responseData.error || 
                              `HTTP ${response.status}: ${response.statusText}`) as string;
          
          console.error('❌ Error creando negocio:', errorMessage);
          
          return {
            success: false,
            error: errorMessage,
            message: errorMessage,
            status: response.status,
            data: responseData
          };
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('💥 Error en petición multipart:', fetchError);
        
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return {
            success: false,
            error: 'La subida de archivos tardó demasiado tiempo. Intente nuevamente.',
            message: 'Timeout de conexión',
            status: 408
          };
        }
        
        return {
          success: false,
          error: fetchError instanceof Error ? fetchError.message : 'Error de conexión',
          message: 'Error al enviar los datos',
          status: 500
        };
      }

    } catch (error) {
      console.error('💥 Error general creando negocio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        message: 'Error al crear el negocio',
        status: 500
      };
    }
  }

  // *** MÉTODO MEJORADO PARA CREAR NEGOCIO (COMPATIBILIDAD CON CÓDIGO EXISTENTE) ***
  public async createBusiness(businessData: any): Promise<ApiResponse<any>> {
    console.log('➕ Creando nuevo negocio (método de compatibilidad):', businessData);
    
    // Si los datos incluyen archivos, usar el método multipart
    if (businessData.files || businessData.logoFile || businessData.cedulaFile || businessData.signatureFile) {
      console.log('🔄 Detectados archivos, redirigiendo a createBusinessWithFiles');
      
      // Extraer archivos del businessData
      const files: any = {};
      if (businessData.logoFile) files.logoFile = businessData.logoFile;
      if (businessData.cedulaFile) files.cedulaFile = businessData.cedulaFile;
      if (businessData.signatureFile) files.signatureFile = businessData.signatureFile;
      if (businessData.carrouselPhotos) files.carrouselPhotos = businessData.carrouselPhotos;
      if (businessData.files) Object.assign(files, businessData.files);
      
      // Limpiar archivos del businessData
      const cleanBusinessData = { ...businessData };
      delete cleanBusinessData.files;
      delete cleanBusinessData.logoFile;
      delete cleanBusinessData.cedulaFile;
      delete cleanBusinessData.signatureFile;
      delete cleanBusinessData.carrouselPhotos;
      
      return this.createBusinessWithFiles(cleanBusinessData, files);
    }
    
    // Validación básica
    if (!businessData.commercialName?.trim()) {
      return {
        success: false,
        error: 'El nombre comercial es requerido',
        status: 400
      };
    }
    
    if (!businessData.representativeName?.trim()) {
      return {
        success: false,
        error: 'El nombre del representante es requerido',
        status: 400
      };
    }

    // Limpiar datos antes de enviar
    const cleanedData = {
      ...businessData,
      commercialName: businessData.commercialName.trim(),
      representativeName: businessData.representativeName.trim(),
      email: businessData.email?.trim() || '',
      phone: businessData.phone?.trim() || '',
      description: businessData.description?.trim() || '',
      productsServices: businessData.productsServices || [],
      schedules: businessData.schedules || [],
      acceptsWhatsappOrders: businessData.acceptsWhatsappOrders || false,
      deliveryService: businessData.deliveryService || 'NO',
      salePlace: businessData.salePlace || 'LOCAL_FIJO',
      registrationDate: businessData.registrationDate || new Date().toISOString().split('T')[0]
    };

    const possibleEndpoints = [
      '/business/create',
      '/business',
      '/admin/business/create',
      '/business/admin/create'
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔄 Intentando crear con endpoint: ${endpoint}`);
        const response = await this.request<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify(cleanedData)
        });
        
        if (response.success) {
          console.log(`✅ Negocio creado exitosamente con endpoint: ${endpoint}`);
          return response;
        } else if (response.status !== 404) {
          return response;
        }
      } catch (error) {
        console.warn(`⚠️ Endpoint ${endpoint} falló:`, error);
      }
    }

    return {
      success: false,
      error: 'No se encontró un endpoint válido para crear negocios',
      status: 404
    };
  }

  // *** MÉTODOS ESPECÍFICOS PARA PROYECTOS ***
  public async getProyectos(page: number = 0, size: number = 10, status?: string, search?: string): Promise<ApiResponse<PaginatedResponse<ProyectoAPI>>> {
    console.log('📋 Obteniendo proyectos con filtros:', { page, size, status, search });
    
    // Usar el endpoint que sabemos que funciona
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString()
    });

    try {
      console.log(`🔄 Usando endpoint: /business/private-list-by-category?${params}`);
      const response = await this.request<any>(`/business/private-list-by-category?${params}`, { method: 'GET' });
      
      if (response.success) {
        console.log(`✅ Éxito obteniendo datos de negocios para proyectos`);
        return response;
      } else {
        console.warn(`⚠️ Endpoint falló:`, response.error);
        return response;
      }
    } catch (error) {
      console.warn(`⚠️ Error con endpoint:`, error);
      throw error;
    }
  }

  public async getProyectosPendientes(page: number = 0, size: number = 10): Promise<ApiResponse<PaginatedResponse<ProyectoAPI>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    return this.request<PaginatedResponse<ProyectoAPI>>(`/admin/pending?${params}`, {
      method: 'GET'
    });
  }

  public async getAdminDashboardStats(): Promise<ApiResponse<{
    totalUsers: number;
    pendingUsers: number;
    approvedUsers: number;
    rejectedUsers?: number;
  }>> {
    console.log('📊 Obteniendo estadísticas del dashboard de administrador');
    
    try {
      // Intentar el endpoint específico primero
      const response = await this.request<{
        totalUsers: number;
        pendingUsers: number;
        approvedUsers: number;
        rejectedUsers?: number;
      }>(`/admin/get-dashboard-stats`, {
        method: 'GET'
      });
      
      if (response.success) {
        console.log('✅ Estadísticas del dashboard obtenidas exitosamente');
        return response;
      } else {
        console.warn('⚠️ Endpoint de dashboard stats falló, usando estadísticas de negocios como respaldo');
        // Usar estadísticas de negocios como respaldo
        const businessStats = await this.getBusinessStats();
        if (businessStats.success && businessStats.data) {
          return {
            success: true,
            data: {
              totalUsers: businessStats.data.total,
              pendingUsers: businessStats.data.pending,
              approvedUsers: businessStats.data.approved,
              rejectedUsers: businessStats.data.rejected
            },
            message: 'Estadísticas calculadas desde datos de negocios'
          };
        }
        return response;
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo estadísticas del dashboard:', error);
      // Usar estadísticas de negocios como respaldo
      const businessStats = await this.getBusinessStats();
      if (businessStats.success && businessStats.data) {
        return {
          success: true,
          data: {
            totalUsers: businessStats.data.total,
            pendingUsers: businessStats.data.pending,
            approvedUsers: businessStats.data.approved,
            rejectedUsers: businessStats.data.rejected
          },
          message: 'Estadísticas calculadas desde datos de negocios (respaldo)'
        };
      }
      return {
        success: false,
        error: 'Error obteniendo estadísticas del dashboard',
        status: 500
      };
    }
  }

  public async aprobarProyecto(projectId: string): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/admin/approve/${projectId}`, {
      method: 'POST'
    });
  }

  public async rechazarProyecto(projectId: string): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/admin/reject/${projectId}`, {
      method: 'POST'
    });
  }

  public async createProyecto(projectData: ProyectoBase): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>('/api/proyectos', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  public async getProyecto(projectId: string): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/api/proyectos/${projectId}`, {
      method: 'GET'
    });
  }

  public async updateProyecto(projectId: string, projectData: Partial<ProyectoBase>): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/api/proyectos/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  }

  public async deleteProyecto(projectId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/proyectos/${projectId}`, {
      method: 'DELETE'
    });
  }

  // *** MÉTODOS PARA DOCUMENTOS DE PROYECTOS ***
  public async getUserCertificate(userId: string): Promise<ApiResponse<string>> {
    console.log('📄 Obteniendo certificado para usuario:', userId);
    
    try {
      const url = `${this.API_BASE_URL}/admin/get-user-certificate?userId=${userId}`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo certificado',
          status: response.status
        };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Certificado obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo certificado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo certificado',
        message: 'Error de conexión'
      };
    }
  }

  public async getUserIdentityDocument(userId: string): Promise<ApiResponse<string>> {
    console.log('🆔 Obteniendo documento de identidad para usuario:', userId);
    
    try {
      const url = `${this.API_BASE_URL}/admin/get-user-identity-document?userId=${userId}`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo documento de identidad',
          status: response.status
        };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Documento de identidad obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo documento de identidad:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo documento de identidad',
        message: 'Error de conexión'
      };
    }
  }

  public async getCurrentUserCertificate(): Promise<ApiResponse<string>> {
    console.log('📄 Obteniendo certificado del usuario actual');
    
    try {
      const url = `${this.API_BASE_URL}/users/get-certificate`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo certificado del usuario actual',
          status: response.status
        };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Certificado obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo certificado del usuario actual:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo certificado',
        message: 'Error de conexión'
      };
    }
  }

  async rechazarUsuario(userId: string, reason: string): Promise<ApiResponse<string>> {
    try {
      const token = this.getCurrentToken();
      
      if (!token) {
        console.error('❌ No hay token de autenticación');
        return {
          success: false,
          error: 'No hay token de autenticación',
          status: 401
        };
      }

      // Construir URL con parámetros query
      const baseUrl = 'http://34.10.172.54:8080';
      const url = new URL(`${baseUrl}/admin/reject/${userId}`);
      url.searchParams.append('reason', reason);

      console.log('🔄 Rechazando usuario:', {
        userId,
        reason: reason.substring(0, 50) + '...',
        url: url.toString()
      });

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textData = await response.text();
        console.log('📄 Respuesta en texto:', textData);
        data = { message: textData || 'Usuario rechazado exitosamente' };
      }

      if (response.ok) {
        console.log('✅ Usuario rechazado exitosamente:', data);
        return {
          success: true,
          data: data.data || data.message || 'Usuario rechazado exitosamente',
          message: data.message || 'Usuario rechazado exitosamente'
        };
      } else {
        console.error('❌ Error del servidor al rechazar usuario:', {
          status: response.status,
          data
        });

        let errorMessage = 'Error al rechazar usuario';
        
        if (response.status === 400) {
          errorMessage = data.message || 'El usuario ya está habilitado';
        } else if (response.status === 404) {
          errorMessage = data.message || 'Usuario no encontrado';
        } else if (response.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        } else if (response.status === 403) {
          errorMessage = 'No tiene permisos para rechazar usuarios';
        } else {
          errorMessage = data.message || data.error || errorMessage;
        }

        return {
          success: false,
          error: errorMessage,
          status: response.status,
          data
        };
      }

    } catch (error) {
      console.error('💥 Error de red al rechazar usuario:', error);
      
      let errorMessage = 'Error de conexión al rechazar usuario';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Error de conexión. Verifique que el servidor esté disponible.';
        } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          errorMessage = 'La conexión tardó demasiado tiempo. Intente nuevamente.';
        } else {
          errorMessage = `Error de conexión: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
        status: 0
      };
    }
  }

  // *** MÉTODOS PARA VERIFICAR PERMISOS Y ROLES ***
  
  /**
   * Obtiene información del token actual (incluye roles)
   * @returns Información del token decodificada
   */
  public getTokenInfo(): any {
    const token = this.getAuthToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 Información del token:', payload);
      return payload;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Verifica si el usuario tiene rol de administrador
   * @returns true si es admin
   */
  public isAdmin(): boolean {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) return false;
    
    // Buscar rol de admin en diferentes campos posibles
    const roles = tokenInfo.roles || tokenInfo.authorities || tokenInfo.role || [];
    const scope = tokenInfo.scope || '';
    
    console.log('🔍 Verificando roles de admin:', { roles, scope, tokenInfo });
    
    // Verificar si tiene rol de admin
    if (Array.isArray(roles)) {
      return roles.some((role: string) => 
        role?.toLowerCase().includes('admin') || 
        role?.toLowerCase().includes('administrator')
      );
    }
    
    if (typeof roles === 'string') {
      return roles.toLowerCase().includes('admin');
    }
    
    if (scope.includes('admin') || scope.includes('ADMIN')) {
      return true;
    }
    
    // Verificar otros campos posibles
    return tokenInfo.isAdmin === true || 
           tokenInfo.admin === true || 
           tokenInfo.userType === 'admin' ||
           tokenInfo.userType === 'ADMIN';
  }

  /**
   * Obtiene información del usuario actual con verificación de permisos
   * @returns Información completa del usuario
   */
  public async getCurrentUserInfo(): Promise<ApiResponse<{
    user: User;
    roles: string[];
    permissions: string[];
    isAdmin: boolean;
  }>> {
    console.log('👤 Obteniendo información completa del usuario actual');
    
    const possibleEndpoints = [
      '/users/me',
      '/auth/user',
      '/user/profile',
      '/api/user/current'
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔄 Intentando endpoint de usuario: ${endpoint}`);
        const response = await this.request<any>(endpoint, { method: 'GET' });
        
        if (response.success) {
          console.log(`✅ Usuario obtenido con endpoint: ${endpoint}`);
          
          const userData = response.data;
          const tokenInfo = this.getTokenInfo();
          
          return {
            success: true,
            data: {
              user: {
                id: userData.id || userData.userId || tokenInfo?.sub || 'unknown',
                username: userData.username || tokenInfo?.username || tokenInfo?.sub || 'unknown',
                email: userData.email || tokenInfo?.email || 'unknown@domain.com',
                role: userData.role || tokenInfo?.role || 'user'
              },
              roles: userData.roles || tokenInfo?.roles || tokenInfo?.authorities || [userData.role || 'user'],
              permissions: userData.permissions || tokenInfo?.permissions || [],
              isAdmin: this.isAdmin()
            },
            message: 'Información de usuario obtenida exitosamente'
          };
        }
      } catch (error) {
        console.warn(`⚠️ Endpoint ${endpoint} falló:`, error);
      }
    }

    // Si no se puede obtener del servidor, usar información del token
    const tokenInfo = this.getTokenInfo();
    if (tokenInfo) {
      console.log('📋 Usando información del token como respaldo');
      return {
        success: true,
        data: {
          user: {
            id: tokenInfo.sub || tokenInfo.userId || 'unknown',
            username: tokenInfo.username || tokenInfo.sub || 'unknown',
            email: tokenInfo.email || 'unknown@domain.com',
            role: tokenInfo.role || 'user'
          },
          roles: tokenInfo.roles || tokenInfo.authorities || [tokenInfo.role || 'user'],
          permissions: tokenInfo.permissions || [],
          isAdmin: this.isAdmin()
        },
        message: 'Información obtenida del token'
      };
    }

    return {
      success: false,
      error: 'No se pudo obtener información del usuario',
      status: 404
    };
  }

  /**
   * Verifica si el usuario actual puede realizar acciones de administrador
   * @returns Resultado de la verificación
   */
  public async checkAdminPermissions(): Promise<{
    hasPermissions: boolean;
    userInfo: any | null;
    suggestions: string[];
  }> {
    console.log('🔐 Verificando permisos de administrador');
    
    const suggestions: string[] = [];
    
    // Verificar si hay token
    if (!this.isAuthenticated()) {
      return {
        hasPermissions: false,
        userInfo: null,
        suggestions: ['Debe iniciar sesión primero']
      };
    }

    // Obtener información del usuario
    const userInfoResponse = await this.getCurrentUserInfo();
    
    if (!userInfoResponse.success || !userInfoResponse.data) {
      suggestions.push('No se pudo obtener información del usuario');
      suggestions.push('Verifique la conexión con el servidor');
      return {
        hasPermissions: false,
        userInfo: null,
        suggestions
      };
    }

    const userInfo = userInfoResponse.data;
    console.log('👤 Información del usuario para verificar permisos:', userInfo);

    // Verificar si es administrador (con verificación de null/undefined)
    if (!userInfo || !userInfo.isAdmin) {
      suggestions.push('Su usuario no tiene permisos de administrador');
      suggestions.push('Contacte al administrador del sistema para obtener permisos');
      suggestions.push('Verifique que esté usando la cuenta correcta');
      
      return {
        hasPermissions: false,
        userInfo: userInfo || null,
        suggestions
      };
    }

    // Probar un endpoint de administrador para confirmar permisos
    try {
      console.log('🧪 Probando acceso a endpoint de administrador');
      const testResponse = await this.request<any>('/admin/test', { method: 'GET' });
      
      if (testResponse.status === 403) {
        suggestions.push('El token no tiene permisos administrativos válidos');
        suggestions.push('Cierre sesión e inicie sesión nuevamente');
        return {
          hasPermissions: false,
          userInfo,
          suggestions
        };
      }
    } catch (error) {
      console.log('⚠️ No se pudo probar endpoint de admin (puede ser normal)');
    }

    return {
      hasPermissions: true,
      userInfo,
      suggestions: ['Permisos de administrador verificados']
    };
  }

  /**
   * Aprueba un negocio con verificación de permisos mejorada - VERSIÓN MEJORADA
   * @param businessId ID del negocio
   * @returns Respuesta de la API con diagnóstico
   */
  /*public async approveBusiness(businessId: number): Promise<ApiResponse<any>> {
    console.log('✅ Aprobando negocio con verificación de permisos:', businessId);

    // Verificar permisos primero
    const permissionCheck = await this.checkAdminPermissions();
    
    if (!permissionCheck.hasPermissions) {
      console.error('❌ Sin permisos de administrador:', permissionCheck.suggestions);
      return {
        success: false,
        error: permissionCheck.suggestions.join('. '),
        message: 'Sin permisos de administrador',
        status: 403,
        data: {
          userInfo: permissionCheck.userInfo,
          suggestions: permissionCheck.suggestions
        }
      };
    }

    console.log('✅ Permisos verificados, procediendo con aprobación');

    // Múltiples enfoques para aprobación según la documentación swagger
    const approvalMethods = [
      // Método 1: Endpoint específico de la documentación swagger que viste
      async () => {
        console.log('🔄 Método 1: POST /admin/business/approve/{businessId}');
        return await this.request<any>(`/admin/business/approve/${businessId}`, {
          method: 'POST'
        });
      },
      
      // Método 2: Endpoint directo de aprobación
      async () => {
        console.log('🔄 Método 2: Endpoint directo POST /business/approve/{id}');
        return await this.request<any>(`/business/approve/${businessId}`, {
          method: 'POST'
        });
      },

      // Método 3: Usando el endpoint exacto que viste en la imagen
      async () => {
        console.log('🔄 Método 3: POST /admin/business/approve/{businessId} - exacto de swagger');
        
        const token = this.getCurrentToken();
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const response = await fetch(`${this.API_BASE_URL}/admin/business/approve/${businessId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,*/
           // 'Accept': '*/*',
           /* 'Content-Type': 'application/json'
          }
        });

        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textData = await response.text();
          data = { 
            success: response.ok,
            message: textData || 'Negocio aprobado exitosamente' 
          };
        }

        if (response.ok) {
          return {
            success: true,
            data: data,
            message: data.message || 'Negocio aprobado exitosamente'
          };
        } else {
          return {
            success: false,
            error: data.message || data.error || 'Error al aprobar negocio',
            status: response.status,
            data: data
          };
        }
      },
      
      // Método 4: Endpoint con body adicional
      async () => {
        console.log('🔄 Método 4: Endpoint con datos de aprobación');
        return await this.request<any>(`/business/approve/${businessId}`, {
          method: 'POST',
          body: JSON.stringify({
            approvedBy: 'admin',
            approvalDate: new Date().toISOString(),
            status: 'APPROVED'
          })
        });
      },
      
      // Método 5: Actualizar estado del negocio PUT
      async () => {
        console.log('🔄 Método 5: PUT para actualizar estado');
        return await this.request<any>(`/business/${businessId}`, {
          method: 'PUT',
          body: JSON.stringify({
            validationStatus: 'APPROVED',
            approvedBy: 'admin',
            approvalDate: new Date().toISOString()
          })
        });
      },
      
      // Método 6: PATCH del estado
      async () => {
        console.log('🔄 Método 6: PATCH del estado');
        return await this.request<any>(`/business/${businessId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            validationStatus: 'APPROVED'
          })
        });
      }
    ];

    let lastError;
    let attemptNumber = 0;

    for (const method of approvalMethods) {
      attemptNumber++;
      try {
        console.log(`🔄 Intento ${attemptNumber}/${approvalMethods.length}`);
        const response = await method();
        
        if (response.success) {
          console.log('🎉 Negocio aprobado exitosamente con método:', attemptNumber);
          return {
            ...response,
            data: {
              ...response.data,
              methodUsed: attemptNumber,
              userInfo: permissionCheck.userInfo
            }
          };
        } else {
          console.log(`❌ Método ${attemptNumber} falló:`, response.error);
          
          // Si es error de permisos, no continuar
          if (response.status === 403 || response.status === 401) {
            return {
              success: false,
              error: response.error || 'Sin permisos para aprobar negocios',
              message: 'Error de permisos',
              status: response.status,
              data: {
                userInfo: permissionCheck.userInfo,
                suggestions: [
                  'Su token no tiene permisos administrativos',
                  'Contacte al administrador del sistema',
                  'Verifique que esté usando la cuenta correcta'
                ]
              }
            };
          }
          
          lastError = response;
        }
        
      } catch (methodError) {
        console.warn(`⚠️ Método ${attemptNumber} falló con excepción:`, methodError);
        lastError = {
          success: false,
          error: 'Error de conexión',
          status: 500
        };
      }
    }

    console.error('❌ Todos los métodos de aprobación fallaron');
    return lastError || {
      success: false,
      error: 'No se encontró un método válido para aprobar el negocio',
      status: 404,
      data: {
        userInfo: permissionCheck.userInfo,
        suggestions: [
          'Todos los métodos de aprobación fallaron',
          'Verifique la conectividad con el servidor',
          'Contacte al administrador técnico'
        ]
      }
    };
  }*/

  /**
   * Obtiene la lista paginada de negocios privados por categoría (ADMIN) - MEJORADO
   * @param page Número de página (base 0)  
   * @param size Tamaño de página
   * @param category Categoría opcional para filtrar
   * @returns Lista paginada de negocios para administración
   */
  public async getPrivateBusinessList(page: number = 0, size: number = 10, category?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(), // Usar base 0 como en el código original
      size: size.toString(),
      ...(category && { category })
    });

    console.log('📋 Obteniendo lista privada de negocios:', { page, size, category });
    
    // Intentar múltiples endpoints para mayor compatibilidad
    const possibleEndpoints = [
      `/business/private-list-by-category?${params}`,
      `/business/admin/list?${params}`,
      `/admin/business/list?${params}`,
      `/business/list?${params}&type=private`
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔄 Intentando endpoint: ${endpoint}`);
        const response = await this.request<any>(endpoint, { method: 'GET' });
        
        if (response.success) {
          console.log(`✅ Éxito con endpoint: ${endpoint}`);
          return response;
        } else if (response.status !== 404) {
          // Si no es 404, hay otro error que debemos reportar
          return response;
        }
      } catch (error) {
        console.warn(`⚠️ Endpoint ${endpoint} falló:`, error);
      }
    }

    return {
      success: false,
      error: 'No se encontró un endpoint válido para obtener la lista de negocios',
      status: 404
    };
  }

  /**
   * Aprueba un negocio con múltiples métodos - MEJORADO
   * @param businessId ID del negocio
   * @returns Respuesta de la API
   */
  public async approveBusiness(businessId: number): Promise<ApiResponse<any>> {
    console.log('✅ Aprobando negocio con múltiples métodos:', businessId);

    // Múltiples enfoques para aprobación según la documentación swagger
    const approvalMethods = [
      // Método 1: Endpoint específico de la documentación swagger
      async () => {
        console.log('🔄 Método 1: POST /admin/business/approve/{businessId}');
        return await this.request<any>(`/admin/business/approve/${businessId}`, {
          method: 'POST'
        });
      },
      
      // Método 2: Endpoint directo de aprobación
      async () => {
        console.log('🔄 Método 2: Endpoint directo POST /business/approve/{id}');
        return await this.request<any>(`/business/approve/${businessId}`, {
          method: 'POST'
        });
      },
      
      // Método 3: Endpoint con body adicional
      async () => {
        console.log('🔄 Método 3: Endpoint con datos de aprobación');
        return await this.request<any>(`/business/approve/${businessId}`, {
          method: 'POST',
          body: JSON.stringify({
            approvedBy: 'admin',
            approvalDate: new Date().toISOString(),
            status: 'APPROVED'
          })
        });
      },
      
      // Método 4: Actualizar estado del negocio PUT
      async () => {
        console.log('🔄 Método 4: PUT para actualizar estado');
        return await this.request<any>(`/business/${businessId}`, {
          method: 'PUT',
          body: JSON.stringify({
            validationStatus: 'APPROVED',
            approvedBy: 'admin',
            approvalDate: new Date().toISOString()
          })
        });
      },
      
      // Método 5: PATCH del estado
      async () => {
        console.log('🔄 Método 5: PATCH del estado');
        return await this.request<any>(`/business/${businessId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            validationStatus: 'APPROVED'
          })
        });
      },
      
      // Método 6: Ruta inversa
      async () => {
        console.log('🔄 Método 6: Ruta inversa');
        return await this.request<any>(`/business/${businessId}/approve`, {
          method: 'POST'
        });
      }
    ];

    let lastError;

    for (const method of approvalMethods) {
      try {
        const response = await method();
        
        if (response.success) {
          console.log('🎉 Negocio aprobado exitosamente con método exitoso');
          return response;
        } else if (response.status !== 404 && response.status !== 500) {
          // Si no es 404 o 500, probablemente es un error de permisos o datos
          lastError = response;
          break;
        }
        
        lastError = response;
      } catch (methodError) {
        console.warn('⚠️ Método de aprobación falló:', methodError);
        lastError = {
          success: false,
          error: 'Error de conexión',
          status: 500
        };
      }
    }

    console.error('❌ Todos los métodos de aprobación fallaron');
    return lastError || {
      success: false,
      error: 'No se encontró un método válido para aprobar el negocio',
      status: 404
    };
  }

  /**
   * Rechaza un negocio con observación con múltiples métodos - MEJORADO
   * @param businessId ID del negocio
   * @param observacion Texto de la observación
   * @returns Respuesta de la API
   */
  public async rejectBusinessWithObservation(businessId: number, observacion: string): Promise<ApiResponse<{ message: string }>> {
    console.log('❌ Rechazando negocio con observación usando múltiples métodos:', { 
      businessId, 
      observacion: observacion.substring(0, 50) + '...' 
    });

    // Múltiples enfoques para rechazo
    const rejectionMethods = [
      // Método 1: Endpoint directo con observacion
      async () => {
        console.log('🔄 Método 1: POST /business/reject/{id} con observacion');
        return await this.request<{ message: string }>(`/business/reject/${businessId}`, {
          method: 'POST',
          body: JSON.stringify({
            observacion: observacion.trim(),
            timestamp: new Date().toISOString()
          })
        });
      },
      
      // Método 2: Con campos alternativos
      async () => {
        console.log('🔄 Método 2: POST con campos alternativos');
        return await this.request<{ message: string }>(`/business/reject/${businessId}`, {
          method: 'POST',
          body: JSON.stringify({
            observations: observacion.trim(),
            reason: observacion.trim(),
            rejectionReason: observacion.trim(),
            rejectedBy: 'admin',
            rejectionDate: new Date().toISOString()
          })
        });
      },
      
      // Método 3: Actualizar estado con observaciones PUT
      async () => {
        console.log('🔄 Método 3: PUT para actualizar estado con observaciones');
        return await this.request<{ message: string }>(`/business/${businessId}`, {
          method: 'PUT',
          body: JSON.stringify({
            validationStatus: 'REJECTED',
            rejectionReason: observacion.trim(),
            rejectedBy: 'admin',
            rejectionDate: new Date().toISOString()
          })
        });
      },
      
      // Método 4: PATCH del estado con observaciones
      async () => {
        console.log('🔄 Método 4: PATCH del estado con observaciones');
        return await this.request<{ message: string }>(`/business/${businessId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            validationStatus: 'REJECTED',
            observations: observacion.trim(),
            rejectionReason: observacion.trim()
          })
        });
      },
      
      // Método 5: Endpoint con admin prefix
      async () => {
        console.log('🔄 Método 5: Endpoint admin');
        return await this.request<{ message: string }>(`/admin/business/reject/${businessId}`, {
          method: 'POST',
          body: JSON.stringify({
            reason: observacion.trim()
          })
        });
      },
      
      // Método 6: Ruta inversa
      async () => {
        console.log('🔄 Método 6: Ruta inversa');
        return await this.request<{ message: string }>(`/business/${businessId}/reject`, {
          method: 'POST',
          body: JSON.stringify({
            observacion: observacion.trim()
          })
        });
      },
      
      // Método 7: Método DELETE (como en rechazarUsuario)
      async () => {
        console.log('🔄 Método 7: DELETE con query params');
        const url = new URL(`${this.API_BASE_URL}/business/reject/${businessId}`);
        url.searchParams.append('reason', observacion.trim());
        
        const token = this.getCurrentToken();
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const response = await fetch(url.toString(), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textData = await response.text();
          data = { message: textData || 'Negocio rechazado exitosamente' };
        }

        if (response.ok) {
          return {
            success: true,
            data: data,
            message: data.message || 'Negocio rechazado exitosamente'
          };
        } else {
          return {
            success: false,
            error: data.message || data.error || 'Error al rechazar negocio',
            status: response.status
          };
        }
      }
    ];

    let lastError;

    for (const method of rejectionMethods) {
      try {
        const response = await method();
        
        if (response.success) {
          console.log('✅ Negocio rechazado exitosamente con método exitoso');
          return response;
        } else if (response.status !== 404 && response.status !== 500) {
          // Si no es 404 o 500, probablemente es un error de permisos o datos
          lastError = response;
          break;
        }
        
        lastError = response;
      } catch (methodError) {
        console.warn('⚠️ Método de rechazo falló:', methodError);
        lastError = {
          success: false,
          error: 'Error de conexión',
          status: 500
        };
      }
    }

    console.error('❌ Todos los métodos de rechazo fallaron');
    return lastError || {
      success: false,
      error: 'No se encontró un método válido para rechazar el negocio',
      status: 404
    };
  }

  /**
   * Obtiene todos los documentos de un negocio usando las URLs del objeto - MEJORADO
   * @param business Objeto del negocio con URLs de documentos
   * @returns Objeto con todos los documentos disponibles
   */
  public async getBusinessDocumentsFromUrls(business: any): Promise<{
    cedula?: string;
    logo?: string;
    signature?: string;
    errors: string[];
  }> {
    console.log('📂 Cargando documentos desde URLs del negocio:', business.id);
    
    const documents: {
      cedula?: string;
      logo?: string;
      signature?: string;
      errors: string[];
    } = { errors: [] };

    // Cargar documentos desde las URLs directamente
    const promises: Promise<any>[] = [];

    // Cédula/RUC
    if (business.cedulaFileUrl) {
      promises.push(
        this.fetchDocumentFromUrl(business.cedulaFileUrl, 'cedula')
          .then(result => ({ type: 'cedula', ...result }))
      );
    }

    // Logo
    if (business.logoUrl) {
      promises.push(
        this.fetchDocumentFromUrl(business.logoUrl, 'logo')
          .then(result => ({ type: 'logo', ...result }))
      );
    }

    // Firma
    if (business.signatureUrl) {
      promises.push(
        this.fetchDocumentFromUrl(business.signatureUrl, 'signature')
          .then(result => ({ type: 'signature', ...result }))
      );
    }

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const docType = result.value.type;
        documents[docType as keyof typeof documents] = result.value.data;
      } else {
        const error = result.status === 'fulfilled' 
          ? result.value.error 
          : 'Error de conexión';
        const docType = index === 0 ? 'Cédula/RUC' : index === 1 ? 'Logo' : 'Firma';
        documents.errors.push(`${docType}: ${error}`);
      }
    });

    console.log('📋 Documentos de negocio cargados desde URLs:', {
      cedula: !!documents.cedula,
      logo: !!documents.logo,
      signature: !!documents.signature,
      errorsCount: documents.errors.length
    });

    return documents;
  }

  /**
   * Obtiene un documento desde una URL específica - NUEVO MÉTODO
   * @param url URL del documento
   * @param type Tipo de documento para logging
   * @returns Documento en base64 o error
   */
  private async fetchDocumentFromUrl(url: string, type: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      console.log(`📄 Obteniendo ${type} desde URL:`, url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Si la URL ya es una imagen base64, devolverla directamente
      if (url.startsWith('data:')) {
        clearTimeout(timeoutId);
        const base64Data = url.split(',')[1];
        return {
          success: true,
          data: base64Data
        };
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status para ${type}: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      // Obtener el tipo de contenido
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('image/') || contentType.includes('application/pdf')) {
        // Para archivos binarios, convertir a base64
        const arrayBuffer = await response.arrayBuffer();
        const base64String = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        return {
          success: true,
          data: base64String
        };
      } else {
        // Si no es un archivo binario, intentar como texto/JSON
        const textContent = await response.text();
        
        try {
          const jsonData = JSON.parse(textContent);
          if (jsonData.data || jsonData.base64 || jsonData.file) {
            return {
              success: true,
              data: jsonData.data || jsonData.base64 || jsonData.file
            };
          }
        } catch {
          // Si no es JSON válido, tratarlo como texto base64
          if (this.isValidBase64(textContent)) {
            return {
              success: true,
              data: textContent
            };
          }
        }
        
        return {
          success: false,
          error: 'Formato de documento no reconocido'
        };
      }
      
    } catch (error) {
      console.error(`💥 Error obteniendo ${type}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión'
      };
    }
  }

  /**
   * Obtiene estadísticas de negocios mejoradas - MEJORADO
   * @returns Estadísticas generales
   */
  public async getBusinessStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>> {
    console.log('📊 Obteniendo estadísticas de negocios');

    // Evitar endpoints problemáticos que causan errores 500
    // Usar directamente el cálculo desde la lista de negocios
    console.log('🔄 Calculando estadísticas desde lista general de negocios');
    try {
      const businessListResponse = await this.getPrivateBusinessList(0, 1000); // Obtener muchos para calcular
      
      if (businessListResponse.success && businessListResponse.data?.data?.content) {
        const businesses = businessListResponse.data.data.content;
        const stats = {
          total: businessListResponse.data.data.totalElements || businesses.length,
          pending: businesses.filter((b: any) => b.validationStatus === 'PENDING').length,
          approved: businesses.filter((b: any) => b.validationStatus === 'APPROVED' || b.validationStatus === 'VALIDATED').length,
          rejected: businesses.filter((b: any) => b.validationStatus === 'REJECTED').length
        };
        
        console.log('✅ Estadísticas calculadas desde lista:', stats);
        return {
          success: true,
          data: stats,
          message: 'Estadísticas calculadas desde lista de negocios'
        };
      } else {
        console.warn('⚠️ No se pudo obtener la lista de negocios para calcular estadísticas');
        return {
          success: false,
          error: 'No se pudo obtener la lista de negocios',
          status: businessListResponse.status || 500
        };
      }
    } catch (error) {
      console.warn('⚠️ Error calculando estadísticas desde lista:', error);
      return {
        success: false,
        error: 'Error de conexión al calcular estadísticas',
        status: 500
      };
    }
  }

  /**
   * Método de debug para probar conectividad con endpoints de negocios
   * @returns Estado de cada endpoint
   */
  public async debugBusinessEndpoints(): Promise<{
    endpoints: Array<{
      url: string;
      status: number;
      success: boolean;
      error?: string;
    }>;
  }> {
    console.log('🔍 Probando conectividad con endpoints de negocios');
    
    const endpointsToTest = [
      '/business/private-list-by-category?page=0&size=1',
      '/business/approve/1',
      '/business/reject/1',
      '/business/stats',
      '/business/categories'
    ];

    const results = [];

    for (const endpoint of endpointsToTest) {
      try {
        console.log(`🔄 Probando: ${endpoint}`);
        
        const method = endpoint.includes('approve') || endpoint.includes('reject') ? 'POST' : 'GET';
        const body = method === 'POST' ? JSON.stringify({ test: true }) : undefined;
        
        const response = await this.request<any>(endpoint, {
          method,
          ...(body && { body })
        });
        
        results.push({
          url: endpoint,
          status: response.status || (response.success ? 200 : 500),
          success: response.success,
          error: response.error
        });
        
      } catch (error) {
        results.push({
          url: endpoint,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log('📋 Resultados de prueba de endpoints:', results);
    return { endpoints: results };
  }

  // *** MÉTODO AUXILIAR PARA COMPATIBILIDAD CON EL COMPONENTE ***

  /**
   * Método específico para el componente LocalesComerciales.tsx
   * Mantiene compatibilidad con el código existente
   */
  public async getBusinessListForComponent(page: number = 0, size: number = 10): Promise<ApiResponse<any>> {
    console.log('🏪 Obteniendo lista de negocios para componente LocalesComerciales');
    
    // Usar el método mejorado
    const response = await this.getPrivateBusinessList(page, size);
    
    // Asegurar la estructura esperada por el componente
    if (response.success && response.data) {
      // Si la respuesta no tiene la estructura .data.data, crearla
      if (!response.data.data && response.data.content) {
        response.data = {
          data: response.data
        };
      }
    }
    
    return response;
  }

  // *** MÉTODOS ORIGINALES PARA LOCALES COMERCIALES (COMPATIBILIDAD) ***

  /**
   * Obtiene la lista paginada de negocios públicos por categoría
   * @param page Número de página (base 0)
   * @param size Tamaño de página
   * @param category Categoría opcional para filtrar
   * @returns Lista paginada de negocios
   */
  public async getBusinessList(page: number = 0, size: number = 10, category?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: (page + 1).toString(), // La API usa páginas base 1
      size: size.toString(),
      ...(category && { category })
    });

    return this.request<any>(`/business/public-list-by-category?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Obtiene la lista de negocios pendientes de aprobación (ADMIN)
   * @param page Número de página (base 0)
   * @param size Tamaño de página
   * @returns Lista paginada de negocios pendientes
   */
  public async getPendingBusinessList(page: number = 0, size: number = 10): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: (page + 1).toString(), // La API usa páginas base 1
      size: size.toString(),
    });

    return this.request<any>(`/business/pending?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Rechaza un negocio (ADMIN) - Método simple para compatibilidad
   * @param businessId ID del negocio
   * @returns Respuesta de la API
   */
  public async rejectBusiness(businessId: number): Promise<ApiResponse<any>> {
    console.log('❌ Rechazando negocio:', businessId);
    return this.request<any>(`/business/reject/${businessId}`, {
      method: 'POST'
    });
  }

  /**
   * Obtiene un negocio específico por ID
   * @param businessId ID del negocio
   * @returns Datos del negocio
   */
  public async getBusiness(businessId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/business/${businessId}`, {
      method: 'GET'
    });
  }

  /**
   * Actualiza un negocio existente
   * @param businessId ID del negocio
   * @param businessData Datos actualizados
   * @returns Negocio actualizado
   */
  public async updateBusiness(businessId: number, businessData: any): Promise<ApiResponse<any>> {
    console.log('✏️ Actualizando negocio:', businessId);
    return this.request<any>(`/business/${businessId}`, {
      method: 'PUT',
      body: JSON.stringify(businessData)
    });
  }

  /**
   * Elimina un negocio
   * @param businessId ID del negocio
   * @returns Respuesta de eliminación
   */
  public async deleteBusiness(businessId: number): Promise<ApiResponse<{ message: string }>> {
    console.log('🗑️ Eliminando negocio:', businessId);
    return this.request<{ message: string }>(`/business/${businessId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Obtiene las categorías de negocios disponibles
   * @returns Lista de categorías
   */
  public async getBusinessCategories(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/business/categories', {
      method: 'GET'
    });
  }

  /**
   * Busca negocios por texto
   * @param query Texto de búsqueda
   * @param page Número de página
   * @param size Tamaño de página
   * @returns Lista paginada de negocios
   */
  public async searchBusinesses(query: string, page: number = 0, size: number = 10): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      q: query,
      page: (page + 1).toString(),
      size: size.toString(),
    });

    return this.request<any>(`/business/search?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Descarga el documento de cédula/RUC de un negocio
   * @param businessId ID del negocio
   * @returns Documento en formato base64
   */
  public async getBusinessDocument(businessId: number): Promise<ApiResponse<string>> {
    console.log('📄 Obteniendo documento para negocio:', businessId);
    
    try {
      const url = `${this.API_BASE_URL}/business/${businessId}/cedula-document`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo documento',
          status: response.status
        };
      }
      
      // Para archivos, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Documento obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo documento',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Carga la imagen/logo de un negocio
   * @param businessId ID del negocio
   * @returns URL de la imagen en base64
   */
  public async getBusinessLogo(businessId: number): Promise<ApiResponse<string>> {
    console.log('🖼️ Obteniendo logo para negocio:', businessId);
    
    try {
      const url = `${this.API_BASE_URL}/business/${businessId}/logo`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo logo',
          status: response.status
        };
      }
      
      // Para imágenes, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Logo obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo logo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo logo',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Obtiene la firma de un negocio
   * @param businessId ID del negocio
   * @returns Firma en base64
   */
  public async getBusinessSignature(businessId: number): Promise<ApiResponse<string>> {
    console.log('✍️ Obteniendo firma para negocio:', businessId);
    
    try {
      const url = `${this.API_BASE_URL}/business/${businessId}/signature`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo firma',
          status: response.status
        };
      }
      
      // Para imágenes, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Firma obtenida exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo firma:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo firma',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Sube un documento para un negocio
   * @param businessId ID del negocio
   * @param file Archivo a subir
   * @param documentType Tipo de documento ('cedula', 'logo', 'signature')
   * @returns Respuesta de la subida
   */
  public async uploadBusinessDocument(businessId: number, file: File, documentType: 'cedula' | 'logo' | 'signature'): Promise<ApiResponse<{ url: string }>> {
    console.log('📤 Subiendo documento para negocio:', { businessId, documentType, fileName: file.name });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      
      const url = `${this.API_BASE_URL}/business/${businessId}/upload-document`;
      console.log(`🌐 Petición POST a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Más tiempo para subidas
      
      // Headers sin Content-Type para FormData
      const headers = { ...this.getHeaders() };
      delete headers['Content-Type'];
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.message || `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error subiendo documento',
          status: response.status
        };
      }
      
      return {
        success: true,
        data: result,
        message: 'Documento subido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error subiendo documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error subiendo documento',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Valida que un negocio existe y el usuario tiene permisos
   * @param businessId ID del negocio
   * @returns true si es válido
   */
  public async validateBusinessAccess(businessId: number): Promise<boolean> {
    try {
      const response = await this.getBusiness(businessId);
      return response.success;
    } catch (error) {
      console.error('Error validando acceso al negocio:', error);
      return false;
    }
  }

  /**
   * Obtiene todos los documentos de un negocio en paralelo
   * @param businessId ID del negocio
   * @returns Objeto con todos los documentos disponibles
   */
  public async getAllBusinessDocuments(businessId: number): Promise<{
    cedula?: string;
    logo?: string;
    signature?: string;
    errors: string[];
  }> {
    console.log('📂 Cargando todos los documentos para negocio:', businessId);
    
    const documents: {
      cedula?: string;
      logo?: string;
      signature?: string;
      errors: string[];
    } = { errors: [] };

    // Cargar documentos en paralelo
    const promises = [
      this.getBusinessDocument(businessId),
      this.getBusinessLogo(businessId),
      this.getBusinessSignature(businessId)
    ];

    const [cedulaResponse, logoResponse, signatureResponse] = await Promise.allSettled(promises);

    // Procesar cédula
    if (cedulaResponse.status === 'fulfilled' && cedulaResponse.value.success && cedulaResponse.value.data) {
      documents.cedula = cedulaResponse.value.data;
    } else {
      const error = cedulaResponse.status === 'fulfilled' 
        ? (cedulaResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Cédula/RUC: ${error}`);
    }

    // Procesar logo
    if (logoResponse.status === 'fulfilled' && logoResponse.value.success && logoResponse.value.data) {
      documents.logo = logoResponse.value.data;
    } else {
      const error = logoResponse.status === 'fulfilled' 
        ? (logoResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Logo: ${error}`);
    }

    // Procesar firma
    if (signatureResponse.status === 'fulfilled' && signatureResponse.value.success && signatureResponse.value.data) {
      documents.signature = signatureResponse.value.data;
    } else {
      const error = signatureResponse.status === 'fulfilled' 
        ? (signatureResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Firma: ${error}`);
    }

    console.log('📋 Documentos de negocio cargados:', {
      cedula: !!documents.cedula,
      logo: !!documents.logo,
      signature: !!documents.signature,
      errorsCount: documents.errors.length
    });

    return documents;
  }

  // *** MÉTODOS UTILITARIOS PARA DOCUMENTOS ***

  /**
   * Convierte datos base64 a URL de objeto para visualización
   * @param base64Data Datos en formato base64
   * @param mimeType Tipo MIME del archivo
   * @returns URL del objeto
   */
  public createObjectURL(base64Data: string, mimeType: string = 'application/pdf'): string {
    try {
      // Decodificar base64 a array de bytes
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creando URL del objeto:', error);
      throw new Error('No se pudo procesar el documento');
    }
  }

  /**
   * Descarga un archivo desde datos base64
   * @param base64Data Datos en formato base64
   * @param filename Nombre del archivo
   * @param mimeType Tipo MIME del archivo
   */
  public downloadFile(base64Data: string, filename: string, mimeType: string = 'application/pdf'): void {
    try {
      const url = this.createObjectURL(base64Data, mimeType);
      
      // Crear enlace temporal para descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL del objeto
      URL.revokeObjectURL(url);
      
      console.log('📥 Archivo descargado:', filename);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      throw new Error('No se pudo descargar el documento');
    }
  }

  /**
   * Valida si los datos base64 son válidos
   * @param base64Data Datos a validar
   * @returns true si son válidos
   */
  public isValidBase64(base64Data: string): boolean {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        return false;
      }
      
      // Verificar formato base64 básico
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(base64Data) && base64Data.length % 4 === 0;
    } catch {
      return false;
    }
  }

  /**
   * Verifica el estado del servidor
   * @returns Estado de conexión
   */
  public async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Servidor no disponible:', error);
      return false;
    }
  }

  /**
   * Obtiene información del usuario actual
   * @returns Datos del usuario
   */
  public async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/users/me');
  }

  /**
   * Logout del usuario
   */
  public async logout(): Promise<void> {
    this.clearAuthToken();
    console.log('👋 Sesión cerrada, token eliminado');
  }

  /**
   * Información de debug para desarrollo
   * @returns Estado actual del servicio
   */
  public getDebugInfo(): {
    isAuthenticated: boolean;
    hasToken: boolean;
    tokenPreview: string;
    baseURL: string;
    tokenExpired: boolean;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!this.getAuthToken(),
      tokenPreview: this.getAuthToken() ? `${this.getAuthToken()!.substring(0, 20)}...` : 'No token',
      baseURL: this.API_BASE_URL,
      tokenExpired: this.isTokenExpired()
    };
  }

  /**
   * Log de información útil para debugging
   */
  public logDebugInfo(): void {
    console.group('🔍 ApiService Debug Info');
    console.log('Estado de autenticación:', this.isAuthenticated());
    console.log('Token presente:', !!this.getAuthToken());
    console.log('Token expirado:', this.isTokenExpired());
    console.log('URL base:', this.API_BASE_URL);
    const token = this.getAuthToken();
    if (token) {
      console.log('Token preview:', `${token.substring(0, 30)}...`);
    }
    console.groupEnd();
  }
}