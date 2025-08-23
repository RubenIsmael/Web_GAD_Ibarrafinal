import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LoginPage from './components/login/loginPage.tsx';
import { ApiService } from './components/login/ApiService';

// *** INSTANCIA GLOBAL SINCRONIZADA ***
const apiService = new ApiService();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🚀 App iniciando - verificando autenticación...');
    
    // *** SINCRONIZACIÓN BIDIRECCIONAL ***
    const syncAuthentication = () => {
      // 1. Verificar localStorage (tu sistema actual)
      const savedAuth = localStorage.getItem('isAuthenticated');
      const savedToken = localStorage.getItem('authToken');
      
      console.log('🔍 Estado localStorage:', {
        isAuthenticated: savedAuth,
        hasToken: !!savedToken,
        tokenPreview: savedToken?.substring(0, 50) + '...'
      });
      
      // 2. Verificar ApiService
      const apiServiceAuth = apiService.isAuthenticated();
      const apiServiceToken = apiService.getCurrentToken();
      
      console.log('🔍 Estado ApiService:', {
        isAuthenticated: apiServiceAuth,
        hasToken: !!apiServiceToken,
        tokenPreview: apiServiceToken?.substring(0, 50) + '...'
      });
      
      // 3. SINCRONIZAR: Si localStorage tiene token pero ApiService no
      if (savedAuth === 'true' && savedToken && !apiServiceAuth) {
        console.log('🔄 Sincronizando: localStorage → ApiService');
        apiService.setToken(savedToken);
      }
      
      // 4. SINCRONIZAR: Si ApiService tiene token pero localStorage no
      if (apiServiceAuth && apiServiceToken && savedAuth !== 'true') {
        console.log('🔄 Sincronizando: ApiService → localStorage');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authToken', apiServiceToken);
      }
      
      // 5. Determinar estado final
      const finalAuth = (savedAuth === 'true' && savedToken) || apiServiceAuth;
      const finalToken = savedToken || apiServiceToken;
      
      console.log('✅ Estado final sincronizado:', {
        isAuthenticated: finalAuth,
        hasToken: !!finalToken
      });
      
      if (finalAuth && finalToken) {
        // Asegurar que ambos sistemas tengan el token
        if (!apiServiceAuth) {
          apiService.setToken(finalToken);
        }
        if (savedAuth !== 'true') {
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('authToken', finalToken);
        }
        
        setIsAuthenticated(true);
        console.log('🎉 Usuario autenticado');
      } else {
        setIsAuthenticated(false);
        console.log('❌ Usuario no autenticado');
      }
    };
    
    syncAuthentication();
    setIsLoading(false);
  }, []);

  const handleLogin = (success: boolean, token?: string) => {
    console.log('🔐 Handle login:', { success, hasToken: !!token });
    
    if (success) {
      // Obtener token del ApiService si no se proporciona
      const finalToken = token || apiService.getCurrentToken();
      
      console.log('🔍 Token para guardar:', finalToken?.substring(0, 50) + '...');
      
      if (finalToken) {
        // *** GUARDAR EN AMBOS SISTEMAS ***
        console.log('💾 Guardando en localStorage...');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authToken', finalToken);
        
        console.log('💾 Sincronizando con ApiService...');
        apiService.setToken(finalToken);
        
        setIsAuthenticated(true);
        console.log('✅ Login sincronizado exitosamente');
        
        // Verificación final
        setTimeout(() => {
          console.log('🔍 Verificación post-login:', {
            localStorage: {
              auth: localStorage.getItem('isAuthenticated'),
              token: !!localStorage.getItem('authToken')
            },
            apiService: {
              auth: apiService.isAuthenticated(),
              token: !!apiService.getCurrentToken()
            }
          });
        }, 100);
        
      } else {
        console.error('❌ Login exitoso pero sin token disponible');
        setIsAuthenticated(false);
      }
    } else {
      console.log('❌ Login falló');
      setIsAuthenticated(false);
      // Limpiar ambos sistemas
      handleLogout();
    }
  };

  const handleLogout = () => {
    console.log('👋 Cerrando sesión...');
    
    // *** LIMPIAR AMBOS SISTEMAS ***
    setIsAuthenticated(false);
    
    // Limpiar localStorage (tu sistema)
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Limpiar ApiService
    apiService.clearToken();
    
    console.log('✅ Sesión cerrada en ambos sistemas');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-600">Verificando sesión...</p>
          {/* Debug info en desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 text-center">
              <p>localStorage: {localStorage.getItem('isAuthenticated') || 'null'}</p>
              <p>ApiService: {apiService.isAuthenticated() ? 'true' : 'false'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
      
      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-50">
          <p>Debug App:</p>
          <p>State Auth: {isAuthenticated ? '✅' : '❌'}</p>
          <p>localStorage: {localStorage.getItem('isAuthenticated') || '❌'}</p>
          <p>ApiService: {apiService.isAuthenticated() ? '✅' : '❌'}</p>
          <p>Tokens match: {localStorage.getItem('authToken') === apiService.getCurrentToken() ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
};

export default App;