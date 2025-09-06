import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { LoginRequest, ServerStatus } from './interfaces';
import { ApiService } from './ApiService'; 
import './login.scss';

// Interfaces para el componente
interface UserData {
  username: string;
  token?: string;
}

interface LoginPageProps {
  onLogin: (success: boolean, userData?: UserData) => void;
}

// *** INSTANCIA GLOBAL DEL SERVICIO ***
const apiService = new ApiService();

export class LoginPageController {
  constructor() {
    // No crear nueva instancia, usar la global
  }

  public async checkServerHealth() {
    return await apiService.healthCheck();
  }

  public async performLogin(credentials: LoginRequest) {
    console.log('🔐 Iniciando login con captura y persistencia automática de token...');
    const result = await apiService.login(credentials);
    
    if (result.success) {
      // Verificar que el token se capturó correctamente
      const capturedToken = apiService.getCurrentToken();
      
      if (capturedToken) {
        console.log('✅ Token JWT capturado y persistido automáticamente durante el login');
        console.log('🔑 Token preview:', capturedToken.substring(0, 50) + '...');
        console.log('🗃️ Token guardado en memoria y storage para persistencia');
        
        // Validar que es un JWT válido
        try {
          const parts = capturedToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('✅ JWT válido confirmado');
            console.log('📋 Información del token:', {
              exp: new Date(payload.exp * 1000).toLocaleString(),
              iat: new Date(payload.iat * 1000).toLocaleString(),
              sub: payload.sub
            });
          }
        } catch (jwtError) {
          console.warn('⚠️ Token no parece ser JWT estándar, pero se mantendrá:', jwtError);
        }
        
      } else if (result.token) {
        console.log('⚠️ Token en respuesta pero no capturado automáticamente, forzando...');
        apiService.setToken(result.token);
      } else {
        console.log('⚠️ Login exitoso pero sin token explícito - posible autenticación por sesión');
      }
    }
    
    return result;
  }

  public validateCredentials(username: string, password: string): string | null {
    if (!username.trim() || !password.trim()) {
      return 'Por favor, complete todos los campos';
    }

    if (username.length < 3) {
      return 'El usuario debe tener al menos 3 caracteres';
    }

    if (password.length < 4) {
      return 'La contraseña debe tener al menos 4 caracteres';
    }

    return null;
  }
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  // Estados del componente
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');

  // Instancia del controlador
  const [controller] = useState(() => new LoginPageController());

  // *** VERIFICAR SESIÓN EXISTENTE AL CARGAR ***
  useEffect(() => {
    console.log('🔍 Verificando sesión existente al cargar componente...');
    
    const checkExistingAuth = async () => {
      // Esperar un poco para sincronización
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('🔑 Estado actual del token:', {
        isAuthenticated: apiService.isAuthenticated(),
        currentToken: apiService.getCurrentToken()?.substring(0, 50) + '...',
        isExpired: apiService.isTokenExpired()
      });
      
      if (apiService.isAuthenticated() && !apiService.isTokenExpired()) {
        console.log('✅ Sesión válida encontrada, usuario ya autenticado');
        // Necesitamos el username almacenado o usar un valor por defecto
        const userData: UserData = {
          username: 'Usuario', // Valor por defecto si no tenemos el username guardado
          token: apiService.getCurrentToken() || undefined
        };
        onLogin(true, userData);
        return;
      }
      
      console.log('❌ No hay sesión válida, mostrando login');
    };
    
    checkExistingAuth();
  }, [onLogin]);

  // Efecto para verificar conexión con el servidor
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        setServerStatus('checking');
        const healthCheck = await controller.checkServerHealth();
        
        if (healthCheck.success) {
          setServerStatus('connected');
          setError('');
        } else {
          setServerStatus('disconnected');
        }
      } catch (err) {
        console.error('Error al verificar conexión del servidor:', err);
        setServerStatus('disconnected');
      }
    };

    checkServerConnection();
    const interval = setInterval(checkServerConnection, 15000);
    return () => clearInterval(interval);
  }, [controller]);

  // Funciones de utilidad
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  };

  const getStatusColor = (): string => {
    switch (serverStatus) {
      case 'connected': return 'connected';
      case 'disconnected': return 'disconnected';
      case 'checking': default: return 'checking';
    }
  };

  const getStatusText = (): string => {
    switch (serverStatus) {
      case 'connected': return 'Servidor conectado';
      case 'disconnected': return 'Servidor desconectado';
      case 'checking': default: return 'Verificando conexión...';
    }
  };

  const getStatusIcon = () => {
    switch (serverStatus) {
      case 'connected': return <Wifi size={16} className="status-icon connected" />;
      case 'disconnected': return <WifiOff size={16} className="status-icon disconnected" />;
      case 'checking': default: 
        return <div className="status-icon spinning"></div>;
    }
  };

  const handleRetryConnection = async () => {
    setServerStatus('checking');
    setError('');
    
    try {
      const healthCheck = await controller.checkServerHealth();
      
      if (healthCheck.success) {
        setServerStatus('connected');
        setError('');
      } else {
        setServerStatus('disconnected');
        setError(healthCheck.error || 'No se pudo conectar con el servidor');
      }
    } catch (retryError) {
      console.error('Error al reintentar conexión:', retryError);
      setServerStatus('disconnected');
      setError('Error al reintentar la conexión');
    }
  };

  // *** FUNCIÓN PRINCIPAL DE LOGIN MEJORADA PARA JWT Y CAPTURA DE USERNAME ***
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const credentials: LoginRequest = {
        username: username.trim(),
        password: password.trim()
      };

      // Validaciones del lado del cliente
      const validationError = controller.validateCredentials(credentials.username, credentials.password);
      if (validationError) {
        setError(validationError);
        setIsLoading(false);
        onLogin(false);
        return;
      }

      if (serverStatus === 'disconnected') {
        setError('No hay conexión con el servidor. Verifique el estado de la red.');
        setIsLoading(false);
        onLogin(false);
        return;
      }

      // *** EJECUTAR LOGIN CON CAPTURA Y PERSISTENCIA AUTOMÁTICA DE JWT ***
      console.log('🚀 Ejecutando login con captura automática de JWT...');
      const response = await controller.performLogin(credentials);
      
      console.log('📋 Respuesta del login:', response);
      
      if (response.success) {
        console.log('🎉 Login exitoso - Verificando captura de JWT...');
        
        // *** VERIFICACIONES POST-LOGIN PARA JWT ***
        const jwtToken = apiService.getCurrentToken();
        const isAuthenticatedAfterLogin = apiService.isAuthenticated();
        const isTokenExpired = apiService.isTokenExpired();
        
        console.log('🔍 Estado después del login:', {
          jwtPresent: !!jwtToken,
          jwtPreview: jwtToken?.substring(0, 50) + '...',
          isAuthenticated: isAuthenticatedAfterLogin,
          isExpired: isTokenExpired,
          responseHadToken: !!response.token
        });
        
        // *** VALIDAR QUE EL JWT SE PERSISTIÓ CORRECTAMENTE ***
        if (!isAuthenticatedAfterLogin || !jwtToken || isTokenExpired) {
          console.error('❌ Error: JWT no se persistió correctamente después del login');
          
          // Intentar recuperar token de la respuesta como último recurso
          if (response.token) {
            console.log('🔄 Intentando usar token de la respuesta...');
            apiService.setToken(response.token);
            
            if (apiService.isAuthenticated()) {
              console.log('✅ Token de respuesta funcionó');
            } else {
              setError('Error al persistir la sesión. Token inválido recibido del servidor.');
              onLogin(false);
              return;
            }
          } else {
            setError('Error al persistir la sesión. No se recibió token JWT válido del servidor.');
            onLogin(false);
            return;
          }
        }
        
        console.log('✅ JWT persistido correctamente, autenticación exitosa');
        
        // *** PREPARAR DATOS DEL USUARIO CON EL NOMBRE CAPTURADO ***
        const finalToken = apiService.getCurrentToken();
        const userData: UserData = {
          username: username.trim(), // Capturar el nombre de usuario ingresado
          token: finalToken || undefined
        };
        
        // *** NOTIFICAR ÉXITO CON LOS DATOS DEL USUARIO ***
        onLogin(true, userData);
        
        // Limpiar formulario tras login exitoso
        setUsername('');
        setPassword('');
        
        // Log final de confirmación
        console.log('🎉 Login completado exitosamente:', {
          username: userData.username,
          tokenLength: finalToken?.length,
          isValid: !apiService.isTokenExpired(),
          preview: finalToken?.substring(0, 30) + '...'
        });
        
      } else {
        console.error('❌ Login falló:', response.message);
        setError(response.message || 'Credenciales incorrectas. Verifique su usuario y contraseña.');
        onLogin(false);
      }
    } catch (err) {
      console.error('💥 Error durante el proceso de login:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('Error de conexión. Verifique que el servidor esté disponible.');
          setServerStatus('disconnected');
        } else if (err.message.includes('timeout') || err.message.includes('AbortError')) {
          setError('La conexión tardó demasiado tiempo. Intente nuevamente.');
        } else {
          setError('Error de autenticación: ' + err.message);
        }
      } else {
        setError('Error de autenticación. Intente nuevamente.');
      }
      
      onLogin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Elementos decorativos de fondo */}
      <div className="bg-decorations">
        <div className="decoration decoration-1"></div>
        <div className="decoration decoration-2"></div>
        <div className="decoration decoration-3"></div>
        <div className="decoration decoration-4"></div>
        <div className="decoration decoration-5"></div>
        <div className="decoration decoration-6"></div>
      </div>
      
      <div className="login-card">
        {/* Indicador de estado del servidor */}
        <div className="server-status">
          {getStatusIcon()}
          <span className={`status-text ${getStatusColor()}`}>
            {serverStatus === 'checking' ? '...' : serverStatus === 'connected' ? '●' : '●'}
          </span>
        </div>
        
        {/* Logo y encabezado */}
        <div className="header-section">
          <div className="logo-container">
            <div className="home-logo-circle">
              <img 
                src="https://seeklogo.com/images/I/ibarra-logo-50CAF2B8D2-seeklogo.com.png" 
                alt="Escudo GAD Ibarra" 
                onError={handleImageError}
              />
            </div>
          </div>
          <h1 className="main-title">Bienvenido</h1>
          <p className="subtitle">Municipalidad de Ibarra</p>
          <p className="description">
            Gestión de Locales Comerciales y Emprendimientos
          </p>
        </div>

        {/* Estado de conexión detallado */}
        <div className="connection-status">
          <div className="status-row">
            <div className="status-info">
              {getStatusIcon()}
              <span className={`status-label ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            {serverStatus === 'disconnected' && (
              <button
                onClick={handleRetryConnection}
                className="retry-button"
                disabled={isLoading}
              >
                Reintentar
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de error mejorado */}
        {error && (
          <div className="error-message">
            <div className="error-content">
              <div className="error-icon">⚠️</div>
              <div className="error-text">{error}</div>
            </div>
            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <div className="error-debug">
                <small>
                  Debug: Token presente: {apiService.isAuthenticated() ? 'SÍ' : 'NO'} | 
                  Expirado: {apiService.isTokenExpired() ? 'SÍ' : 'NO'} |
                  Tipo: {apiService.getCurrentToken()?.includes('.') ? 'JWT' : 'Simple'}
                </small>
              </div>
            )}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Usuario
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Ingrese su usuario"
                required
                disabled={isLoading}
                autoComplete="username"
                minLength={3}
              />
            </div>
            
            <div className="form-group password-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input password-input"
                placeholder="Ingrese su contraseña"
                required
                disabled={isLoading}
                autoComplete="current-password"
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                disabled={isLoading}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || serverStatus === 'disconnected'}
            className="submit-button"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Ingresar</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="footer-section">
          <p className="copyright">
            © 2025 GAD Municipal de Ibarra
          </p>
          <p className="version">
            Versión 1.2.6 {/*- 👤 Ing. Verdesoto V. Ruben Ismael*/}
          </p>
         {/* <p className="version">
            Desarrollador Ing. Verdesoto V. Ruben Ismael,   
                          Ing. Zambrano S. Nathaly Licett, 
                          Ing. Suarez A. Fernando Anderson, 
                          Ing. López B. Israel Isaias, 
          </p>*/}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;