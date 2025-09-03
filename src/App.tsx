import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LoginPage from './components/login/loginPage.tsx';
import { ApiService } from './components/login/ApiService';
import { UserData } from './components/login/interfaces';

// *** INSTANCIA GLOBAL SINCRONIZADA ***
const apiService = new ApiService();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | undefined>(undefined); // *** CAMBIADO DE null A undefined ***
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🚀 App iniciando - verificando autenticación...');
    
    // *** SINCRONIZACIÓN BIDIRECCIONAL CON USERDATA ***
    const syncAuthentication = () => {
      // 1. Verificar localStorage (tu sistema actual)
      const savedAuth = localStorage.getItem('isAuthenticated');
      const savedToken = localStorage.getItem('authToken');
      const savedUserData = localStorage.getItem('userData');
      
      console.log('🔍 Estado localStorage:', {
        isAuthenticated: savedAuth,
        hasToken: !!savedToken,
        hasUserData: !!savedUserData,
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
      
      // 6. Recuperar datos del usuario
      let finalUserData: UserData | undefined = undefined; // *** CAMBIADO DE null A undefined ***
      if (savedUserData) {
        try {
          finalUserData = JSON.parse(savedUserData);
          console.log('📋 UserData recuperado:', finalUserData);
        } catch (error) {
          console.warn('⚠️ Error parseando userData guardado:', error);
        }
      }
      
      // Si no hay userData pero sí token, crear uno básico
      if (finalAuth && finalToken && !finalUserData) {
        finalUserData = {
          username: 'Usuario', // Valor por defecto
          token: finalToken
        };
        console.log('🔄 UserData creado por defecto:', finalUserData);
      }
      
      console.log('✅ Estado final sincronizado:', {
        isAuthenticated: finalAuth,
        hasToken: !!finalToken,
        userData: finalUserData
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
        setUserData(finalUserData);
        console.log('🎉 Usuario autenticado con datos:', finalUserData?.username);
      } else {
        setIsAuthenticated(false);
        setUserData(undefined); // *** CAMBIADO DE null A undefined ***
        console.log('❌ Usuario no autenticado');
      }
    };
    
    syncAuthentication();
    setIsLoading(false);
  }, []);

  // *** FUNCIÓN DE LOGIN ACTUALIZADA PARA USERDATA ***
  const handleLogin = (success: boolean, userData?: UserData) => {
    console.log('🔐 Handle login:', { success, userData });
    
    if (success && userData) {
      // Obtener token del userData o del ApiService
      const finalToken = userData.token || apiService.getCurrentToken();
      
      console.log('🔍 Datos para guardar:', {
        username: userData.username,
        hasToken: !!finalToken,
        tokenPreview: finalToken?.substring(0, 50) + '...'
      });
      
      if (finalToken) {
        // *** GUARDAR EN AMBOS SISTEMAS CON USERDATA ***
        console.log('💾 Guardando en localStorage...');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authToken', finalToken);
        localStorage.setItem('userData', JSON.stringify({
          username: userData.username,
          token: finalToken
        }));
        
        console.log('💾 Sincronizando con ApiService...');
        apiService.setToken(finalToken);
        
        setIsAuthenticated(true);
        setUserData({
          username: userData.username,
          token: finalToken
        });
        
        console.log('✅ Login sincronizado exitosamente para:', userData.username);
        
        // Verificación final
        setTimeout(() => {
          console.log('🔍 Verificación post-login:', {
            localStorage: {
              auth: localStorage.getItem('isAuthenticated'),
              token: !!localStorage.getItem('authToken'),
              userData: !!localStorage.getItem('userData')
            },
            apiService: {
              auth: apiService.isAuthenticated(),
              token: !!apiService.getCurrentToken()
            },
            state: {
              isAuthenticated,
              userData: userData?.username
            }
          });
        }, 100);
        
      } else {
        console.error('❌ Login exitoso pero sin token disponible');
        setIsAuthenticated(false);
        setUserData(undefined); // *** CAMBIADO DE null A undefined ***
      }
    } else {
      console.log('❌ Login falló o sin datos de usuario');
      setIsAuthenticated(false);
      setUserData(undefined); // *** CAMBIADO DE null A undefined ***
      // Limpiar ambos sistemas
      handleLogout();
    }
  };

  const handleLogout = () => {
    console.log('👋 Cerrando sesión...');
    
    // *** LIMPIAR AMBOS SISTEMAS Y ESTADO ***
    setIsAuthenticated(false);
    setUserData(undefined); // *** CAMBIADO DE null A undefined ***
    
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
              <p>localStorage: {localStorage.getItem('isAuthenticated') || 'undefined'}</p>
              <p>ApiService: {apiService.isAuthenticated() ? 'true' : 'false'}</p>
              <p>UserData: {userData?.username || 'undefined'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard 
          onLogout={handleLogout} 
          userData={userData} // *** AHORA ES UserData | undefined, COMPATIBLE CON DashboardProps ***
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
      
      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-50">
          <p>Debug App:</p>
          <p>State Auth: {isAuthenticated ? '✅' : '❌'}</p>
          <p>State User: {userData?.username || '❌'}</p>
          <p>localStorage: {localStorage.getItem('isAuthenticated') || '❌'}</p>
          <p>ApiService: {apiService.isAuthenticated() ? '✅' : '❌'}</p>
          <p>UserData stored: {localStorage.getItem('userData') ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
};

export default App;