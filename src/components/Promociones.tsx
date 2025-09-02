import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Filter, MapPin, Phone, Mail, Eye, Edit, Trash2, Building, User, Calendar, FileText, Download, Tag, Image, Clock, X, Check } from 'lucide-react';
import { ApiService } from './login/ApiService';
import '../styles/promociones.css';

// Usar la misma instancia global del servicio
const apiService = new ApiService();

// Interfaces para promociones
interface Promocion {
  id: number;
  nombreLocal: string;
  datosPersona: {
    nombre: string;
    cedula: string;
    telefono: string;
    email: string;
  };
  descripcionPromocion: string;
  fechaInicio: string;
  fechaFin: string;
  logoEmpresa?: string;
  imagenPromocion?: string;
     estado: 'ACTIVA' | 'PENDIENTE' | 'RECHAZADA';
  categoria: string;
  descuento?: number;
  precioOriginal?: number;
  precioPromocional?: number;
}

// Interfaces para locales comerciales
interface BusinessAPI {
  id: number;
  commercialName: string;
  representativeName: string;
  cedulaOrRuc: string;
  phone: string;
  email: string;
  logoUrl?: string;
  category: {
    id: number;
    name: string;
  };
}

const Promociones: React.FC = () => {
  // Estados para promociones
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [promocionesFiltradas, setPromocionesFiltradas] = useState<Promocion[]>([]);
  const [locales, setLocales] = useState<BusinessAPI[]>([]);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  
  // Estados para UI
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<'connected' | 'error' | 'unknown'>('unknown');
  
  // Estados para nueva promoción
  const [newPromocion, setNewPromocion] = useState({
    nombreLocal: '',
    datosPersona: {
      nombre: '',
      cedula: '',
      telefono: '',
      email: ''
    },
    descripcionPromocion: '',
    fechaInicio: '',
    fechaFin: '',
    logoEmpresa: '',
    imagenPromocion: '',
    categoria: '',
    descuento: 0,
    precioOriginal: 0,
    precioPromocional: 0
  });

  // Estados para modales
  const [selectedPromocion, setSelectedPromocion] = useState<Promocion | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Función unificada para verificar token
  const verificarToken = (): boolean => {
    console.log('🔍 Verificando estado de autenticación...');

    const token = apiService.getCurrentToken();
    const isAuth = apiService.isAuthenticated();

    if (!isAuth || !token) {
      console.error('❌ No hay token de autenticación válido');
      setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
      return false;
    }

    if (apiService.isTokenExpired()) {
      console.warn('⚠️ Token expirado');
      setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      apiService.clearToken();
      return false;
    }

    console.log('✅ Token válido y no expirado');
    return true;
  };

  // Cargar promociones desde la API (simulado por ahora)
  const loadPromociones = async () => {
    try {
      setLoading(true);
      setError('');

      if (!verificarToken()) {
        setLoading(false);
        return;
      }

      // Simular carga de promociones (en producción esto vendría de la API)
      const promocionesSimuladas: Promocion[] = [
        {
          id: 1,
          nombreLocal: "Restaurante El Sabor",
          datosPersona: {
            nombre: "María González",
            cedula: "1234567890",
            telefono: "0987654321",
            email: "maria@elsabor.com"
          },
          descripcionPromocion: "2x1 en platos principales todos los martes",
          fechaInicio: "2024-01-01",
          fechaFin: "2024-12-31",
          logoEmpresa: "", // Se llenará con la imagen del backend
          imagenPromocion: "", // Se llenará con la imagen del backend
                     estado: 'ACTIVA',
           categoria: 'Alimentos',
           descuento: 50,
           precioOriginal: 15,
           precioPromocional: 7.5
         },
         {
           id: 2,
           nombreLocal: "Farmacia San José",
           datosPersona: {
             nombre: "Carlos Rodríguez",
             cedula: "0987654321",
             telefono: "1234567890",
             email: "carlos@farmaciasanjose.com"
           },
           descripcionPromocion: "20% de descuento en productos de cuidado personal",
           fechaInicio: "2024-01-15",
           fechaFin: "2024-02-15",
           logoEmpresa: "", // Se llenará con la imagen del backend
           imagenPromocion: "", // Se llenará con la imagen del backend
           estado: 'PENDIENTE',
           categoria: 'Salud',
           descuento: 20,
           precioOriginal: 25,
           precioPromocional: 20
         },
         {
           id: 3,
           nombreLocal: "Tienda de Ropa Moda Express",
           datosPersona: {
             nombre: "Ana Pérez",
             cedula: "1122334455",
             telefono: "5566778899",
             email: "ana@modaexpress.com"
           },
           descripcionPromocion: "Liquidación de verano: hasta 70% de descuento",
           fechaInicio: "2024-01-20",
           fechaFin: "2024-02-20",
           logoEmpresa: "", // Se llenará con la imagen del backend
           imagenPromocion: "", // Se llenará con la imagen del backend
           estado: 'RECHAZADA',
           categoria: 'Comercio',
           descuento: 70,
           precioOriginal: 100,
           precioPromocional: 30
         }
      ];

             // Aplicar orden LIFO (Last In, First Out) - las más recientes primero
       const promocionesOrdenadas = [...promocionesSimuladas].sort((a, b) => b.id - a.id);
       setPromociones(promocionesOrdenadas);
       setPromocionesFiltradas(promocionesOrdenadas);
       setTotalPages(Math.ceil(promocionesOrdenadas.length / pageSize));
      
      console.log('✅ Promociones cargadas exitosamente');

    } catch (err) {
      console.error('💥 Error cargando promociones:', err);
      setError('Error al cargar las promociones');
    } finally {
      setLoading(false);
    }
  };

  // Función para hacer peticiones con reintentos
  const makeRequestWithRetry = async (url: string, options: any, maxRetries: number = 3): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${maxRetries} para: ${url}`);
        const response = await apiService.request(url, options);
        
        // Verificar que la respuesta sea válida
        if (response && (response.success || response.data)) {
          console.log(`✅ Intento ${attempt} exitoso`);
          return response;
        } else {
          console.warn(`⚠️ Intento ${attempt} falló - Respuesta inválida:`, response);
          if (attempt === maxRetries) {
            throw new Error('Respuesta del backend inválida después de todos los intentos');
          }
        }
      } catch (error) {
        console.warn(`⚠️ Intento ${attempt} falló:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // Esperar antes del siguiente intento con backoff exponencial
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Cargar locales comerciales
  const loadLocales = async () => {
    try {
      if (!verificarToken()) return;

      console.log('🔍 Verificando imágenes disponibles en el backend...');
      setBackendStatus('unknown');
      
      const response: any = await makeRequestWithRetry('/business/private-list-by-category?page=0&size=100', {
        method: 'GET'
      });

      if (response && response.success && response.data && response.data.data) {
        const localesData = response.data.data.content;
        setLocales(localesData);
        setBackendStatus('connected');
        
        // Verificar si hay imágenes disponibles
        const localesConImagenes = localesData.filter((local: BusinessAPI) => local.logoUrl);
        console.log(`📊 Total de locales: ${localesData.length}`);
        console.log(`🖼️ Locales con imágenes: ${localesConImagenes.length}`);
        
        if (localesConImagenes.length > 0) {
          console.log('✅ Imágenes disponibles en el backend:');
          localesConImagenes.forEach((local: BusinessAPI) => {
            console.log(`   - ${local.commercialName}: ${local.logoUrl}`);
          });
          
         
// Asignar imágenes del backend a las promociones correspondientes
setPromociones(prevPromociones => 
  prevPromociones.map(promocion => {
    const localBackend = localesData.find((local: BusinessAPI) => 
      local.commercialName.toLowerCase().includes(promocion.nombreLocal.toLowerCase()) ||
      promocion.nombreLocal.toLowerCase().includes(local.commercialName.toLowerCase())
    );
    
    if (localBackend && localBackend.logoUrl) {
      console.log(`🔄 Asignando imagen del backend a: ${promocion.nombreLocal}`);
      return { 
        ...promocion, 
        logoEmpresa: localBackend.logoUrl,
        // Generar imagen de promoción basada en el logo del backend
        imagenPromocion: generarImagenesPromocion(localBackend.logoUrl)
      };
    }
    
    return promocion;
  })
);
} else {
  console.log('⚠️ No hay imágenes disponibles en el backend');
  // Usar imágenes por defecto si no hay imágenes en el backend
  setPromociones(prevPromociones => 
    prevPromociones.map(promocion => ({
      ...promocion,
      logoEmpresa: `https://picsum.photos/200/200?random=${promocion.id}`,
      imagenPromocion: `https://picsum.photos/400/250?random=${promocion.id + 100}`
    }))
  );
}
        
        // Mostrar información en la consola para debugging
        console.log('📋 Datos completos de locales:', localesData);
      } else {
        console.warn('⚠️ Respuesta del backend sin datos válidos:', response);
        setBackendStatus('error');
        // Usar imágenes por defecto si la respuesta no es válida
        setPromociones(prevPromociones => 
          prevPromociones.map(promocion => ({
            ...promocion,
            logoEmpresa: `https://picsum.photos/200/200?random=${promocion.id}`,
            imagenPromocion: `https://picsum.photos/400/250?random=${promocion.id + 100}`
          }))
        );
      }
    } catch (err) {
      console.error('❌ Error cargando locales:', err);
      setBackendStatus('error');
      
      // Si hay error, usar imágenes por defecto
      console.log('🔄 Usando imágenes por defecto debido al error del backend');
      setPromociones(prevPromociones => 
        prevPromociones.map(promocion => ({
          ...promocion,
          logoEmpresa: `https://picsum.photos/200/200?random=${promocion.id}`,
          imagenPromocion: `https://picsum.photos/400/250?random=${promocion.id + 100}`
        }))
      );
    }
  };

  // Crear promoción
  const crearPromocion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPromocion.nombreLocal.trim() || !newPromocion.descripcionPromocion.trim()) {
      alert('Nombre del local y descripción de la promoción son requeridos');
      return;
    }

    try {
      if (!verificarToken()) return;

      setLoading(true);
      
      // Simular creación (en producción esto se enviaría a la API)
      const nuevaPromocion: Promocion = {
        id: Date.now(),
        ...newPromocion,
        estado: 'PENDIENTE'
      };

             // Aplicar LIFO: nueva promoción al principio
       setPromociones(prev => [nuevaPromocion, ...prev]);
       setPromocionesFiltradas(prev => [nuevaPromocion, ...prev]);
      
      setShowModal(false);
      setNewPromocion({
        nombreLocal: '',
        datosPersona: {
          nombre: '',
          cedula: '',
          telefono: '',
          email: ''
        },
        descripcionPromocion: '',
        fechaInicio: '',
        fechaFin: '',
        logoEmpresa: '',
        imagenPromocion: '',
        categoria: '',
        descuento: 0,
        precioOriginal: 0,
        precioPromocional: 0
      });
      
      alert('Promoción creada exitosamente');
      
    } catch (err) {
      console.error('Error al crear promoción:', err);
      alert('Error al crear promoción');
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar promociones
  const filtrarPromociones = useCallback(() => {
    let promocionesFiltradas = promociones;

         // Filtrar por estado
     if (filterStatus !== 'all') {
       const estadoFiltro = filterStatus === 'rechazada' ? 'RECHAZADA' : filterStatus.toUpperCase();
       promocionesFiltradas = promocionesFiltradas.filter(promocion => 
         promocion.estado === estadoFiltro
       );
     }

    // Filtrar por categoría
    if (filterCategoria !== 'all') {
      promocionesFiltradas = promocionesFiltradas.filter(promocion => 
        promocion.categoria.toLowerCase() === filterCategoria.toLowerCase()
      );
    }

    // Filtrar por búsqueda
    if (searchTerm.trim() !== '') {
      const terminoBusqueda = searchTerm.toLowerCase();
      promocionesFiltradas = promocionesFiltradas.filter(promocion =>
        promocion.nombreLocal.toLowerCase().includes(terminoBusqueda) ||
        promocion.datosPersona.nombre.toLowerCase().includes(terminoBusqueda) ||
        promocion.descripcionPromocion.toLowerCase().includes(terminoBusqueda) ||
        promocion.categoria.toLowerCase().includes(terminoBusqueda)
      );
    }

         // Mantener orden LIFO en los filtros
     const promocionesFiltradasOrdenadas = promocionesFiltradas.sort((a, b) => b.id - a.id);
     setPromocionesFiltradas(promocionesFiltradasOrdenadas);
     setTotalPages(Math.ceil(promocionesFiltradasOrdenadas.length / pageSize));
  }, [promociones, filterStatus, filterCategoria, searchTerm, pageSize]);

  // Cambiar página
  const changePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Cambiar tamaño de página
  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    setTotalPages(Math.ceil(promocionesFiltradas.length / newSize));
  };

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    setCurrentPage(0);
    setTimeout(() => filtrarPromociones(), 0);
  };

  const handleCategoriaChange = (newCategoria: string) => {
    setFilterCategoria(newCategoria);
    setCurrentPage(0);
    setTimeout(() => filtrarPromociones(), 0);
  };

  // Efecto inicial
  useEffect(() => {
    console.log('🚀 Iniciando componente Promociones...');
    loadPromociones();
    loadLocales();
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (!apiService.isAuthenticated()) return;

    const delayedSearch = setTimeout(() => {
      filtrarPromociones();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filtrarPromociones]);

  // Efecto para aplicar filtros cuando cambien las promociones
  useEffect(() => {
    if (promociones.length > 0) {
      filtrarPromociones();
    }
  }, [promociones, filtrarPromociones]);

     const getStatusColor = (estado: string): string => {
     switch (estado) {
       case 'ACTIVA': return 'bg-green-100 text-green-800';
       case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
       case 'RECHAZADA': return 'bg-red-100 text-red-800';
       default: return 'bg-gray-100 text-gray-800';
     }
   };

     const getStatusText = (estado: string): string => {
     switch (estado) {
       case 'ACTIVA': return 'Activa';
       case 'PENDIENTE': return 'Pendiente';
       case 'RECHAZADA': return 'Rechazada';
       default: return estado;
     }
   };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Función para validar URLs de imágenes
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Función para verificar si una imagen es accesible
  const checkImageAccessibility = async (url: string): Promise<boolean> => {
    try {
      // Agregar timeout para evitar esperas largas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
} catch (error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      console.warn(`⏰ Timeout verificando imagen: ${url}`);
    } else {
      console.warn(`❌ Error verificando imagen: ${url}`, error.message);
    }
  } else {
    console.warn(`❌ Error desconocido verificando imagen: ${url}`, String(error));
  }
  return false;
}
  };

  // Función para verificar todas las imágenes del backend
  const verificarImagenesBackend = async () => {
    try {
      console.log('🔍 Verificando accesibilidad de imágenes del backend...');
      
      if (locales.length === 0) {
        console.log('⚠️ No hay locales cargados para verificar');
        return;
      }

      const localesConImagenes = locales.filter(local => local.logoUrl);
      
      if (localesConImagenes.length === 0) {
        console.log('⚠️ No hay URLs de imágenes para verificar');
        return;
      }

      console.log(`🖼️ Verificando ${localesConImagenes.length} imágenes...`);
      
      for (const local of localesConImagenes) {
        if (local.logoUrl) {
          const isAccessible = await checkImageAccessibility(local.logoUrl);
          console.log(`${isAccessible ? '✅' : '❌'} ${local.commercialName}: ${local.logoUrl} - ${isAccessible ? 'Accesible' : 'No accesible'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error verificando imágenes:', error);
    }
  };

  // Función para generar imágenes de promoción basadas en los logos del backend
  const generarImagenesPromocion = (logoUrl: string): string => {
    try {
      // Validar que la URL sea válida
      if (!logoUrl || !isValidImageUrl(logoUrl)) {
        console.warn('⚠️ URL de imagen no válida, usando imagen por defecto');
        return `https://picsum.photos/400/250?random=${Math.floor(Math.random() * 1000)}`;
      }
      
      // Si el logo es de un servicio de imágenes, generar variaciones
      if (logoUrl.includes('picsum.photos')) {
        const randomId = Math.floor(Math.random() * 1000);
        return `https://picsum.photos/400/250?random=${randomId}`;
      }
      
      // Si es otra URL, usar el logo como imagen de promoción
      return logoUrl;
    } catch (error) {
      console.error('❌ Error generando imagen de promoción:', error);
      // Fallback a imagen por defecto
      return `https://picsum.photos/400/250?random=${Math.floor(Math.random() * 1000)}`;
    }
  };

     // Función para cambiar el estado de una promoción
   const cambiarEstadoPromocion = (promocionId: number, nuevoEstado: 'ACTIVA' | 'RECHAZADA') => {
     try {
       if (!verificarToken()) return;
 
       setLoading(true);
       
       // Simular cambio de estado (en producción esto se enviaría a la API)
       setPromociones(prevPromociones => 
         prevPromociones.map(promocion => 
           promocion.id === promocionId 
             ? { ...promocion, estado: nuevoEstado }
             : promocion
         )
       );
       
       // Actualizar también las promociones filtradas
       setPromocionesFiltradas(prevPromociones => 
         prevPromociones.map(promocion => 
           promocion.id === promocionId 
             ? { ...promocion, estado: nuevoEstado }
             : promocion
         )
       );
       
       // Mostrar mensaje de confirmación
       const mensaje = nuevoEstado === 'ACTIVA' ? 'Promoción aceptada exitosamente' : 'Promoción rechazada exitosamente';
       alert(mensaje);
       
       console.log(`✅ Estado de promoción ${promocionId} cambiado a: ${nuevoEstado}`);
       
     } catch (err) {
       console.error('❌ Error cambiando estado de promoción:', err);
       alert('Error al cambiar el estado de la promoción');
     } finally {
       setLoading(false);
     }
   };
 
   // Obtener promociones paginadas
   const getPromocionesPaginadas = () => {
     const startIndex = currentPage * pageSize;
     const endIndex = startIndex + pageSize;
     return promocionesFiltradas.slice(startIndex, endIndex);
   };

  return (
    <div className="promociones-container">
             <div className="promociones-header">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="promociones-title">
               <Tag className="w-8 h-8 text-red-600 mr-3" />
               Promociones de Locales Comerciales
             </h1>
                      <p className="promociones-subtitle">
           Gestión y visualización de promociones activas de los locales comerciales
         </p>
           </div>
           
           {/* Indicador de estado del backend */}
           <div className="flex items-center space-x-2">
             <span className="text-sm text-gray-600">Backend:</span>
             <div className={`w-3 h-3 rounded-full ${
               backendStatus === 'connected' ? 'bg-green-500' : 
               backendStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
             }`}></div>
             <span className={`text-xs ${
               backendStatus === 'connected' ? 'text-green-600' : 
               backendStatus === 'error' ? 'text-red-600' : 'text-yellow-600'
             }`}>
               {backendStatus === 'connected' ? 'Conectado' : 
                backendStatus === 'error' ? 'Error' : 'Verificando...'}
             </span>
           </div>
         </div>
       </div>

             {/* Mensaje de error */}
       {error && (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center">
               <span className="text-lg mr-2">⚠️</span>
               <span className="font-medium">{error}</span>
             </div>
             <button
               onClick={() => setError('')}
               className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
             >
               Cerrar
             </button>
           </div>
         </div>
       )}

       {/* Mensaje de estado del backend */}
       {backendStatus === 'error' && (
         <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center">
               <span className="text-lg mr-2">🔌</span>
               <div>
                 <span className="font-medium">Problemas de conexión con el backend</span>
                 <p className="text-sm mt-1">
                   La aplicación está funcionando con imágenes por defecto. 
                   Algunas funcionalidades pueden estar limitadas.
                 </p>
               </div>
             </div>
             <button
               onClick={() => {
                 setBackendStatus('unknown');
                 loadLocales();
               }}
               className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
             >
               Reintentar
             </button>
           </div>
         </div>
       )}

      {/* Estadísticas */}
      <div className="promociones-stats-grid">
        <div className="promociones-stat-card">
          <div className="promociones-stat-content">
            <div>
              <p className="promociones-stat-text-sm">Total Promociones</p>
              <p className="promociones-stat-text-lg">{promociones.length}</p>
            </div>
            <div className="promociones-stat-icon-container bg-blue-100">
              <Tag className="promociones-stat-icon text-blue-600" />
            </div>
          </div>
        </div>
        <div className="promociones-stat-card">
          <div className="promociones-stat-content">
            <div>
              <p className="promociones-stat-text-sm">Activas</p>
              <p className="promociones-stat-text-lg">{promociones.filter(p => p.estado === 'ACTIVA').length}</p>
            </div>
            <div className="promociones-stat-icon-container bg-green-100">
              <Tag className="promociones-stat-icon text-green-600" />
            </div>
          </div>
        </div>
        <div className="promociones-stat-card">
          <div className="promociones-stat-content">
            <div>
              <p className="promociones-stat-text-sm">Pendientes</p>
              <p className="promociones-stat-text-lg">{promociones.filter(p => p.estado === 'PENDIENTE').length}</p>
            </div>
            <div className="promociones-stat-icon-container bg-yellow-100">
              <Clock className="promociones-stat-icon text-yellow-600" />
            </div>
          </div>
        </div>
                 <div className="promociones-stat-card">
           <div className="promociones-stat-content">
             <div>
               <p className="promociones-stat-text-sm">Rechazadas</p>
               <p className="promociones-stat-text-lg">{promociones.filter(p => p.estado === 'RECHAZADA').length}</p>
             </div>
             <div className="promociones-stat-icon-container bg-red-100">
               <X className="promociones-stat-icon text-red-600" />
             </div>
           </div>
         </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="promociones-filters">
        <div className="promociones-filters-container">
          <div className="promociones-search-container">
            <Search className="promociones-search-icon" />
            <input
              type="text"
              placeholder="Buscar promociones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="promociones-search-input"
              disabled={!apiService.isAuthenticated() || loading}
            />
          </div>

          <div className="promociones-filters-actions">
            <div className="promociones-filter-group">
              <Filter className="promociones-filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="promociones-filter-select"
                disabled={!apiService.isAuthenticated() || loading}
              >
                                 <option value="all">Todos los estados</option>
                 <option value="activa">Activa</option>
                 <option value="pendiente">Pendiente</option>
                 <option value="rechazada">Rechazada</option>
              </select>
            </div>

            <div className="promociones-filter-group">
              <Filter className="promociones-filter-icon" />
              <select
                value={filterCategoria}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="promociones-filter-select"
                disabled={!apiService.isAuthenticated() || loading}
              >
                <option value="all">Todas las categorías</option>
                <option value="alimentos">Alimentos</option>
                <option value="comercio">Comercio</option>
                <option value="salud">Salud</option>
                <option value="servicios">Servicios</option>
              </select>
            </div>

                         <div className="promociones-filter-group">
               <span className="text-sm text-gray-600">Mostrar:</span>
               <select
                 value={pageSize}
                 onChange={(e) => changePageSize(parseInt(e.target.value))}
                 className="promociones-filter-select"
                 disabled={!apiService.isAuthenticated() || loading}
               >
                 <option value={5}>5 por página</option>
                 <option value={10}>10 por página</option>
                 <option value={20}>20 por página</option>
                 <option value={50}>50 por página</option>
               </select>
             </div>

             

                         
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2 text-gray-600">
            {promociones.length === 0 ? 'Cargando promociones...' : 'Actualizando...'}
          </span>
        </div>
      )}

      {/* Lista de promociones */}
      <div className="promociones-list">
        {!loading && promocionesFiltradas.length === 0 && promociones.length > 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron promociones</p>
              <p className="text-sm">
                {filterStatus !== 'all' || filterCategoria !== 'all'
                  ? 'No hay promociones con los filtros aplicados'
                  : searchTerm
                    ? `No hay promociones que coincidan con "${searchTerm}"`
                    : 'No hay promociones registradas'
                }
              </p>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterCategoria('all');
                  setSearchTerm('');
                  filtrarPromociones();
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {!loading && getPromocionesPaginadas().map((promocion) => (
          <div key={promocion.id} className="promociones-card">
            <div className="promociones-card-content">
              <div className="promociones-card-main">
                <div className="promociones-card-header">
                  <div className="promociones-card-logo">
                    {promocion.logoEmpresa ? (
                      <img 
                        src={promocion.logoEmpresa} 
                        alt={`Logo ${promocion.nombreLocal}`}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center ${promocion.logoEmpresa ? 'hidden' : ''}`}>
                      <Building className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="promociones-card-info">
                    <div className="promociones-card-title">
                      <h3 className="promociones-card-name">{promocion.nombreLocal}</h3>
                      <span className={`promociones-card-badge ${getStatusColor(promocion.estado)}`}>
                        {getStatusText(promocion.estado)}
                      </span>
                      <span className="promociones-card-badge bg-blue-100 text-blue-800">
                        {promocion.categoria}
                      </span>
                    </div>
                    <p className="promociones-card-description">{promocion.descripcionPromocion}</p>
                    <div className="promociones-card-dates">
                      <span className="text-sm text-gray-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {formatDate(promocion.fechaInicio)} - {formatDate(promocion.fechaFin)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Imagen de la promoción */}
                {promocion.imagenPromocion && (
                  <div className="promociones-card-image">
                    <img 
                      src={promocion.imagenPromocion} 
                      alt="Imagen promoción"
                      className="w-full h-48 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Image className="w-12 h-12 text-gray-400" />
                      <span className="ml-2 text-gray-500 text-sm">Imagen no disponible</span>
                    </div>
                  </div>
                )}

                {/* Información de precios si está disponible */}
                {promocion.precioOriginal && promocion.precioPromocional && (
                  <div className="promociones-card-prices">
                    <span className="text-gray-500 line-through">${promocion.precioOriginal}</span>
                    <span className="text-2xl font-bold text-red-600">${promocion.precioPromocional}</span>
                    {promocion.descuento && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                        -{promocion.descuento}%
                      </span>
                    )}
                  </div>
                )}
              </div>

                              {/* Botón de acción */}
                <div className="promociones-card-actions">
                  <button
                    onClick={() => {
                      setSelectedPromocion(promocion);
                      setShowViewModal(true);
                    }}
                    className="promociones-action-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                    title="Ver detalles de la promoción"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver</span>
                  </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje cuando no hay promociones */}
      {!loading && promociones.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay promociones</h3>
          <p className="text-gray-500 mb-4">
            {error ?
              'Hubo un problema al cargar las promociones.' :
              'Aún no hay promociones registradas.'
            }
          </p>
          {!error && apiService.isAuthenticated() && (
            <button
              onClick={() => loadPromociones()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Recargar promociones
            </button>
          )}
        </div>
      )}

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white px-6 py-3 border-t border-gray-200 rounded-lg shadow-sm mt-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 0 || !apiService.isAuthenticated() || loading}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || !apiService.isAuthenticated() || loading}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>

          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando{' '}
                <span className="font-medium">{currentPage * pageSize + 1}</span>
                {' '}a{' '}
                <span className="font-medium">
                  {Math.min((currentPage + 1) * pageSize, promocionesFiltradas.length)}
                </span>
                {' '}de{' '}
                <span className="font-medium">{promocionesFiltradas.length}</span>
                {' '}promociones
              </p>
            </div>

            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage <= 2) {
                    pageNum = i;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => changePage(pageNum)}
                      disabled={!apiService.isAuthenticated() || loading}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-red-50 border-red-500 text-red-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal para nueva promoción */}
      {showModal && (
        <div className="promociones-modal-overlay">
          <div className="promociones-modal">
            <h2 className="promociones-modal-title">Nueva Promoción</h2>
            <form onSubmit={crearPromocion} className="promociones-modal-form">
              <div className="promociones-form-grid">
                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Nombre del Local *
                  </label>
                  <select
                    value={newPromocion.nombreLocal}
                    onChange={(e) => setNewPromocion({ ...newPromocion, nombreLocal: e.target.value })}
                    className="promociones-form-select"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  >
                    <option value="">Seleccionar local</option>
                    {locales.map(local => (
                      <option key={local.id} value={local.commercialName}>
                        {local.commercialName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Categoría *
                  </label>
                  <select
                    value={newPromocion.categoria}
                    onChange={(e) => setNewPromocion({ ...newPromocion, categoria: e.target.value })}
                    className="promociones-form-select"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Alimentos">Alimentos</option>
                    <option value="Comercio">Comercio</option>
                    <option value="Salud">Salud</option>
                    <option value="Servicios">Servicios</option>
                  </select>
                </div>

                <div className="promociones-form-group locales-form-full-width">
                  <label className="promociones-form-label">
                    Descripción de la Promoción *
                  </label>
                  <textarea
                    value={newPromocion.descripcionPromocion}
                    onChange={(e) => setNewPromocion({ ...newPromocion, descripcionPromocion: e.target.value })}
                    className="promociones-form-input"
                    rows={3}
                    placeholder="Describe la promoción..."
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    value={newPromocion.fechaInicio}
                    onChange={(e) => setNewPromocion({ ...newPromocion, fechaInicio: e.target.value })}
                    className="promociones-form-input"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    value={newPromocion.fechaFin}
                    onChange={(e) => setNewPromocion({ ...newPromocion, fechaFin: e.target.value })}
                    className="promociones-form-input"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newPromocion.descuento}
                    onChange={(e) => setNewPromocion({ ...newPromocion, descuento: parseInt(e.target.value) || 0 })}
                    className="promociones-form-input"
                    placeholder="0"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Precio Original ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPromocion.precioOriginal}
                    onChange={(e) => setNewPromocion({ ...newPromocion, precioOriginal: parseFloat(e.target.value) || 0 })}
                    className="promociones-form-input"
                    placeholder="0.00"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Precio Promocional ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPromocion.precioPromocional}
                    onChange={(e) => setNewPromocion({ ...newPromocion, precioPromocional: parseFloat(e.target.value) || 0 })}
                    className="promociones-form-input"
                    placeholder="0.00"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Logo de la Empresa (URL)
                  </label>
                  <input
                    type="url"
                    value={newPromocion.logoEmpresa}
                    onChange={(e) => setNewPromocion({ ...newPromocion, logoEmpresa: e.target.value })}
                    className="promociones-form-input"
                    placeholder="https://ejemplo.com/logo.png"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                  {newPromocion.logoEmpresa && !isValidImageUrl(newPromocion.logoEmpresa) && (
                    <p className="text-red-500 text-xs mt-1">URL de imagen no válida</p>
                  )}
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">
                    Imagen de la Promoción (URL)
                  </label>
                  <input
                    type="url"
                    value={newPromocion.imagenPromocion}
                    onChange={(e) => setNewPromocion({ ...newPromocion, imagenPromocion: e.target.value })}
                    className="promociones-form-input"
                    placeholder="https://ejemplo.com/promocion.jpg"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                  {newPromocion.imagenPromocion && !isValidImageUrl(newPromocion.imagenPromocion) && (
                    <p className="text-red-500 text-xs mt-1">URL de imagen no válida</p>
                  )}
                </div>

                {/* Vista previa de imágenes */}
                {(newPromocion.logoEmpresa || newPromocion.imagenPromocion) && (
                  <div className="promociones-form-group locales-form-full-width">
                    <label className="promociones-form-label">Vista Previa</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {newPromocion.logoEmpresa && isValidImageUrl(newPromocion.logoEmpresa) && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-2">Logo</p>
                          <img 
                            src={newPromocion.logoEmpresa} 
                            alt="Vista previa logo"
                            className="w-24 h-24 object-cover rounded-lg border mx-auto"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-24 h-24 bg-gray-200 rounded-lg border flex items-center justify-center mx-auto">
                            <Building className="w-8 h-8 text-gray-400" />
                          </div>
                        </div>
                      )}
                      
                      {newPromocion.imagenPromocion && isValidImageUrl(newPromocion.imagenPromocion) && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-2">Imagen Promoción</p>
                          <img 
                            src={newPromocion.imagenPromocion} 
                            alt="Vista previa promoción"
                            className="w-32 h-24 object-cover rounded-lg border mx-auto"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-32 h-24 bg-gray-200 rounded-lg border flex items-center justify-center mx-auto">
                            <Image className="w-8 h-8 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="promociones-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="promociones-cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="promociones-submit-button"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  {loading ? 'Creando...' : 'Crear Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver detalles */}
      {showViewModal && selectedPromocion && (
        <div className="promociones-modal-overlay">
          <div className="promociones-modal max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="promociones-modal-title">
                Detalles de la Promoción
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedPromocion(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl font-bold">×</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    Información del Local
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Local</label>
                      <p className="text-sm text-gray-900 font-medium">{selectedPromocion.nombreLocal}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Representante</label>
                      <p className="text-sm text-gray-900">{selectedPromocion.datosPersona.nombre}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                      <p className="text-sm text-gray-900">{selectedPromocion.datosPersona.cedula}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <p className="text-sm text-gray-900">{selectedPromocion.datosPersona.telefono}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900">{selectedPromocion.datosPersona.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    Detalles de la Promoción
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <p className="text-sm text-gray-900">{selectedPromocion.categoria}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPromocion.estado)}`}>
                        {getStatusText(selectedPromocion.estado)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedPromocion.fechaInicio)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedPromocion.fechaFin)}</p>
                    </div>
                    {selectedPromocion.descuento && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                        <p className="text-sm text-gray-900 font-semibold text-red-600">{selectedPromocion.descuento}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-blue-200 pb-2">
                    Descripción de la Promoción
                  </h3>
                  <p className="text-sm text-gray-900 leading-relaxed">{selectedPromocion.descripcionPromocion}</p>
                </div>
                
                {selectedPromocion.precioOriginal && selectedPromocion.precioPromocional && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-green-200 pb-2">
                      Información de Precios
                    </h3>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio Original</label>
                        <span className="text-xl text-gray-500 line-through">${selectedPromocion.precioOriginal}</span>
                      </div>
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio Promocional</label>
                        <span className="text-3xl font-bold text-red-600">${selectedPromocion.precioPromocional}</span>
                      </div>
                      {selectedPromocion.descuento && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                          <span className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-lg font-bold">
                            -{selectedPromocion.descuento}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Imágenes */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-purple-200 pb-2">
                    Imágenes de la Promoción
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedPromocion.logoEmpresa && (
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Logo de la Empresa</label>
                        <div className="relative inline-block">
                          <img 
                            src={selectedPromocion.logoEmpresa} 
                            alt={`Logo ${selectedPromocion.nombreLocal}`}
                            className="w-40 h-40 object-cover rounded-lg border-2 border-purple-200 shadow-lg hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-40 h-40 bg-gray-200 rounded-lg border-2 border-purple-200 flex items-center justify-center">
                            <Building className="w-12 h-12 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedPromocion.imagenPromocion && (
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Imagen de la Promoción</label>
                        <div className="relative inline-block">
                          <img 
                            src={selectedPromocion.imagenPromocion} 
                            alt="Imagen promoción"
                            className="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-purple-200 shadow-lg hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full max-w-xs h-48 bg-gray-200 rounded-lg border-2 border-purple-200 flex items-center justify-center">
                            <Image className="w-16 h-16 text-gray-400" />
                            <span className="text-gray-500 text-sm ml-2">Imagen no disponible</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center mt-6 pt-4 border-t">
              {/* Botones de Aceptar y Rechazar solo para promociones pendientes */}
              {selectedPromocion.estado === 'PENDIENTE' && (
                <div className="flex gap-3 mr-auto">
                  <button
                    onClick={() => {
                      cambiarEstadoPromocion(selectedPromocion.id, 'ACTIVA');
                      setShowViewModal(false);
                      setSelectedPromocion(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    title="Aceptar promoción"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aceptar</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      cambiarEstadoPromocion(selectedPromocion.id, 'RECHAZADA');
                      setShowViewModal(false);
                      setSelectedPromocion(null);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    title="Rechazar promoción"
                  >
                    <X className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedPromocion(null);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promociones;
