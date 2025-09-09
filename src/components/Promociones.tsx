import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Filter, MapPin, Phone, Mail, Eye, Edit, Trash2, Building, User, Calendar, FileText, Download, Tag, Image, Clock, X, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { apiPromocion, Promocion, PromocionFiltros, EstadisticasPromociones } from './login/ApiPromocion';
import '../styles/promociones.css';

const Promociones: React.FC = () => {
  // Estados para promociones
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [promocionesPaginadas, setPromocionesPaginadas] = useState<Promocion[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPromociones | null>(null);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'activa' | 'caducada'>('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Estados para UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<'connected' | 'error' | 'unknown'>('unknown');
  
  // Estados para modales
  const [selectedPromocion, setSelectedPromocion] = useState<Promocion | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Función para verificar token
  const verificarToken = (): boolean => {
    console.log('🔍 Verificando estado de autenticación...');

    const isAuth = apiPromocion.isAuthenticated();

    if (!isAuth) {
      console.error('❌ No hay token de autenticación válido');
      setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
      return false;
    }

    if (apiPromocion.isTokenExpired()) {
      console.warn('⚠️ Token expirado');
      setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      apiPromocion.clearToken();
      return false;
    }

    console.log('✅ Token válido y no expirado');
    return true;
  };

  // Cargar promociones desde la API
  const loadPromociones = async (page: number = 0, resetData: boolean = false) => {
    try {
      setLoading(true);
      if (resetData) {
        setError('');
      }

      if (!verificarToken()) {
        setLoading(false);
        return;
      }

      console.log(`📋 Cargando promociones - Página: ${page}, Tamaño: ${pageSize}`);

      // Preparar filtros
      const filtros: PromocionFiltros = {};
      
      if (searchTerm.trim()) {
        filtros.searchTerm = searchTerm.trim();
      }

      if (filterStatus !== 'all') {
        filtros.isActive = filterStatus === 'activa';
      }

      if (filterCategoria !== 'all') {
        filtros.category = filterCategoria;
      }

      // Buscar promociones con paginación
      const response = await apiPromocion.buscarPromociones(filtros, page, pageSize);

      if (response.success && response.data) {
        const { content, totalElements: total, totalPages: pages } = response.data;
        
        // Verificar y actualizar estado de promociones automáticamente
        const promocionesActualizadas = content.map(promocion => ({
          ...promocion,
          isActive: apiPromocion.isPromocionActiva(promocion)
        }));

        setPromocionesPaginadas(promocionesActualizadas);
        setTotalElements(total);
        setTotalPages(pages);
        setCurrentPage(page);
        setBackendStatus('connected');
        
        console.log(`✅ Promociones cargadas: ${promocionesActualizadas.length} de ${total} total`);
        
        // Cargar todas las promociones para estadísticas si es la primera página
        if (page === 0 || resetData) {
          loadTodasLasPromociones();
        }

      } else {
        console.error('❌ Error en respuesta:', response.error);
        setError(response.error || 'Error al cargar las promociones');
        setBackendStatus('error');
      }

    } catch (err) {
      console.error('💥 Error cargando promociones:', err);
      setError('Error al cargar las promociones');
      setBackendStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar todas las promociones para estadísticas
  const loadTodasLasPromociones = async () => {
    try {
      const response = await apiPromocion.obtenerPromocionesPublicas();
      
      if (response.success && response.data) {
        // Verificar y actualizar estado automáticamente
        const promocionesActualizadas = response.data.map(promocion => ({
          ...promocion,
          isActive: apiPromocion.isPromocionActiva(promocion)
        }));
        
        setPromociones(promocionesActualizadas);
        await loadEstadisticas();
      }
    } catch (err) {
      console.error('Error cargando todas las promociones:', err);
    }
  };

  // Cargar estadísticas
  const loadEstadisticas = async () => {
    try {
      const response = await apiPromocion.obtenerEstadisticas();
      
      if (response.success && response.data) {
        setEstadisticas(response.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  // Función para cambiar página
  const changePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      loadPromociones(newPage);
    }
  };

  // Función para cambiar tamaño de página
  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadPromociones(0, true);
  };

  // Función para aplicar filtros
  const aplicarFiltros = useCallback(() => {
    setCurrentPage(0);
    loadPromociones(0, true);
  }, [searchTerm, filterStatus, filterCategoria, pageSize]);

  // Funciones para manejar cambios en filtros
  const handleFilterChange = (newFilter: 'all' | 'activa' | 'caducada') => {
    setFilterStatus(newFilter);
  };

  const handleCategoriaChange = (newCategoria: string) => {
    setFilterCategoria(newCategoria);
  };

  // Efecto inicial
  useEffect(() => {
    console.log('🚀 Iniciando componente Promociones...');
    loadPromociones(0, true);
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (!apiPromocion.isAuthenticated()) return;

    const delayedSearch = setTimeout(() => {
      aplicarFiltros();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Efecto para aplicar filtros cuando cambien
  useEffect(() => {
    if (apiPromocion.isAuthenticated()) {
      aplicarFiltros();
    }
  }, [filterStatus, filterCategoria]);

  // Efecto para actualizar estados automáticamente cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      // Verificar promociones caducadas y actualizarlas automáticamente
      if (promocionesPaginadas.length > 0) {
        const promocionesActualizadas = promocionesPaginadas.map(promocion => ({
          ...promocion,
          isActive: apiPromocion.isPromocionActiva(promocion)
        }));
        
        // Solo actualizar si hay cambios en el estado
        const hayChangios = promocionesActualizadas.some((p, index) => 
          p.isActive !== promocionesPaginadas[index]?.isActive
        );
        
        if (hayChangios) {
          console.log('🔄 Actualizando estados de promociones automáticamente');
          setPromocionesPaginadas(promocionesActualizadas);
        }
      }
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [promocionesPaginadas]);

  // Función para obtener el estado actual de una promoción
  const getEstadoPromocion = (promocion: Promocion): 'ACTIVA' | 'CADUCADA' => {
    return apiPromocion.isPromocionActiva(promocion) ? 'ACTIVA' : 'CADUCADA';
  };

  const getStatusColor = (promocion: Promocion): string => {
    const estado = getEstadoPromocion(promocion);
    switch (estado) {
      case 'ACTIVA': return 'bg-green-100 text-green-800';
      case 'CADUCADA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (promocion: Promocion): string => {
    const estado = getEstadoPromocion(promocion);
    switch (estado) {
      case 'ACTIVA': return 'Activa';
      case 'CADUCADA': return 'Caducada';
      default: return 'Desconocido';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para descargar imagen
  const descargarImagen = async (url: string, nombre: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error('No se pudo obtener la imagen');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${nombre.replace(/[^a-z0-9]/gi, '_')}.jpg`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Error descargando imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  // Función para ver imagen en línea
  const verImagenEnLinea = (url: string) => {
    window.open(url, '_blank');
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategoria('all');
    setCurrentPage(0);
    setTimeout(() => {
      loadPromociones(0, true);
    }, 100);
  };

  // Función para recargar datos
  const recargarDatos = () => {
    setError('');
    setBackendStatus('unknown');
    loadPromociones(currentPage, true);
  };

  const getCategorias = (): string[] => {
    const categorias = new Set<string>();
    promociones.forEach(p => {
      if (p.category) {
        categorias.add(p.category);
      }
    });
    return Array.from(categorias).sort();
  };

  return (
    <div className="promociones-container">
      {/* Header */}
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
          <div className="flex items-center space-x-4">
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
            
            <button
              onClick={recargarDatos}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              disabled={loading}
            >
              <Clock className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
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

      {/* Estadísticas */}
      {estadisticas && (
        <div className="promociones-stats-grid">
          <div className="promociones-stat-card">
            <div className="promociones-stat-content">
              <div>
                <div className="promociones-stat-text-sm">Total Promociones</div>
                <div className="promociones-stat-text-lg">{estadisticas.totalPromociones}</div>
              </div>
              <div className="promociones-stat-icon-container bg-blue-100">
                <Tag className="promociones-stat-icon text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="promociones-stat-card">
            <div className="promociones-stat-content">
              <div>
                <div className="promociones-stat-text-sm">Promociones Activas</div>
                <div className="promociones-stat-text-lg text-green-600">{estadisticas.activas}</div>
              </div>
              <div className="promociones-stat-icon-container bg-green-100">
                <Check className="promociones-stat-icon text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="promociones-stat-card">
            <div className="promociones-stat-content">
              <div>
                <div className="promociones-stat-text-sm">Promociones Caducadas</div>
                <div className="promociones-stat-text-lg text-red-600">{estadisticas.caducadas}</div>
              </div>
              <div className="promociones-stat-icon-container bg-red-100">
                <X className="promociones-stat-icon text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="promociones-stat-card">
            <div className="promociones-stat-content">
              <div>
                <div className="promociones-stat-text-sm">Categorías</div>
                <div className="promociones-stat-text-lg">{Object.keys(estadisticas.porCategoria).length}</div>
              </div>
              <div className="promociones-stat-icon-container bg-purple-100">
                <Filter className="promociones-stat-icon text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

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
              disabled={!apiPromocion.isAuthenticated() || loading}
            />
          </div>

          <div className="promociones-filters-actions">
            <div className="promociones-filter-group">
              <Filter className="promociones-filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'activa' | 'caducada')}
                className="promociones-filter-select"
                disabled={!apiPromocion.isAuthenticated() || loading}
              >
                <option value="all">Todos los estados</option>
                <option value="activa">Activas</option>
                <option value="caducada">Caducadas</option>
              </select>
            </div>

            <div className="promociones-filter-group">
              <Tag className="promociones-filter-icon" />
              <select
                value={filterCategoria}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="promociones-filter-select"
                disabled={!apiPromocion.isAuthenticated() || loading}
              >
                <option value="all">Todas las categorías</option>
                {getCategorias().map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>

            <div className="promociones-filter-group">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(parseInt(e.target.value))}
                className="promociones-filter-select"
                disabled={!apiPromocion.isAuthenticated() || loading}
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>

            {(searchTerm || filterStatus !== 'all' || filterCategoria !== 'all') && (
              <button
                onClick={limpiarFiltros}
                className="promociones-filter-select bg-gray-100 hover:bg-gray-200 border-gray-300"
                disabled={loading}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2 text-gray-600">Cargando promociones...</span>
        </div>
      )}

      {/* Lista de promociones */}
      <div className="promociones-list">
        {!loading && promocionesPaginadas.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron promociones</p>
              <p className="text-sm">
                {error ? 'Hubo un problema al cargar las promociones.' :
                 filterStatus !== 'all' || filterCategoria !== 'all' || searchTerm ?
                 'No hay promociones con los filtros aplicados' :
                 'No hay promociones registradas'}
              </p>
              {!error && (
                <div className="mt-4 space-x-2">
                  <button
                    onClick={limpiarFiltros}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Limpiar filtros
                  </button>
                  <button
                    onClick={recargarDatos}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Recargar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && promocionesPaginadas.map((promocion) => (
          <div key={promocion.id} className="promociones-card">
            <div className="promociones-card-content">
              <div className="promociones-card-main">
                <div className="promociones-card-header">
                  <div className="promociones-card-logo">
                    {promocion.logoUrl ? (
                      <img 
                        src={promocion.logoUrl} 
                        alt={`Logo ${promocion.businessName}`}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center ${promocion.logoUrl ? 'hidden' : ''}`}>
                      <Building className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="promociones-card-info">
                    <div className="promociones-card-title">
                      <h3 className="promociones-card-name">{promocion.businessName}</h3>
                      <span className={`promociones-card-badge ${getStatusColor(promocion)}`}>
                        {getStatusText(promocion)}
                      </span>
                      {promocion.category && (
                        <span className="promociones-card-badge bg-blue-100 text-blue-800">
                          {promocion.category}
                        </span>
                      )}
                      {promocion.promotionType && (
                        <span className="promociones-card-badge bg-purple-100 text-purple-800">
                          {promocion.promotionType.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="promociones-card-description">{promocion.description}</p>
                    <div className="promociones-card-dates">
                      <span className="text-sm text-gray-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {formatDate(promocion.startDate)} - {formatDate(promocion.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Imagen de la promoción */}
                {promocion.imageUrl && (
                  <div className="promociones-card-image">
                    <img 
                      src={promocion.imageUrl} 
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
                {(promocion.originalPrice || promocion.promotionalPrice || promocion.discountPercentage) && (
                  <div className="promociones-card-prices">
                    {promocion.originalPrice && promocion.promotionalPrice && (
                      <>
                        <span className="text-gray-500 line-through">${promocion.originalPrice}</span>
                        <span className="text-2xl font-bold text-red-600">${promocion.promotionalPrice}</span>
                      </>
                    )}
                    {promocion.discountPercentage && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                        -{promocion.discountPercentage}%
                      </span>
                    )}
                    {promocion.discountAmount && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        -${promocion.discountAmount}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
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
                  <span>Ver Detalles</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white px-6 py-3 border-t border-gray-200 rounded-lg shadow-sm mt-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 0 || loading}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || loading}
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
                  {Math.min((currentPage + 1) * pageSize, totalElements)}
                </span>
                {' '}de{' '}
                <span className="font-medium">{totalElements}</span>
                {' '}promociones
              </p>
            </div>

            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 0 || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
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
                      disabled={loading}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-red-50 border-red-500 text-red-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1 || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </nav>
            </div>
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
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    Información del Negocio
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
                      <p className="text-sm text-gray-900 font-medium">{selectedPromocion.businessName}</p>
                    </div>
                    {selectedPromocion.representativeName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Representante</label>
                        <p className="text-sm text-gray-900">{selectedPromocion.representativeName}</p>
                      </div>
                    )}
                    {selectedPromocion.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <p className="text-sm text-gray-900">{selectedPromocion.phone}</p>
                      </div>
                    )}
                    {selectedPromocion.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-sm text-gray-900">{selectedPromocion.email}</p>
                      </div>
                    )}
                    {selectedPromocion.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <p className="text-sm text-gray-900">{selectedPromocion.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    Detalles de la Promoción
                  </h3>
                  <div className="space-y-4">
                    {selectedPromocion.category && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <p className="text-sm text-gray-900">{selectedPromocion.category}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Promoción</label>
                      <p className="text-sm text-gray-900">{selectedPromocion.promotionType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPromocion)}`}>
                        {getStatusText(selectedPromocion)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedPromocion.startDate)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedPromocion.endDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-blue-200 pb-2">
                    Descripción de la Promoción
                  </h3>
                  <p className="text-sm text-gray-900 leading-relaxed">{selectedPromocion.description}</p>
                </div>
                
                {(selectedPromocion.originalPrice || selectedPromocion.promotionalPrice || selectedPromocion.discountPercentage || selectedPromocion.discountAmount) && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-green-200 pb-2">
                      Información de Precios y Descuentos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedPromocion.originalPrice && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Precio Original</label>
                          <span className="text-xl text-gray-500 line-through">${selectedPromocion.originalPrice}</span>
                        </div>
                      )}
                      {selectedPromocion.promotionalPrice && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Precio Promocional</label>
                          <span className="text-2xl font-bold text-red-600">${selectedPromocion.promotionalPrice}</span>
                        </div>
                      )}
                      {selectedPromocion.discountPercentage && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                          <span className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-lg font-bold">
                            -{selectedPromocion.discountPercentage}%
                          </span>
                        </div>
                      )}
                      {selectedPromocion.discountAmount && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Fijo</label>
                          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-lg font-bold">
                            -${selectedPromocion.discountAmount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Imágenes */}
                {(selectedPromocion.logoUrl || selectedPromocion.imageUrl) && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-purple-200 pb-2">
                      Imágenes de la Promoción
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedPromocion.logoUrl && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-3">Logo del Negocio</label>
                          <div className="relative inline-block">
                            <img 
                              src={selectedPromocion.logoUrl} 
                              alt={`Logo ${selectedPromocion.businessName}`}
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
                          <div className="mt-3 flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => verImagenEnLinea(selectedPromocion.logoUrl!)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                              title="Ver imagen en línea"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver en línea
                            </button>
                            <button
                              onClick={() => descargarImagen(selectedPromocion.logoUrl!, `logo-${selectedPromocion.businessName}`)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                              title="Descargar imagen"
                            >
                              <Download className="w-3 h-3" />
                              Descargar
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {selectedPromocion.imageUrl && (
                        <div className="text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-3">Imagen de la Promoción</label>
                          <div className="relative inline-block">
                            <img 
                              src={selectedPromocion.imageUrl} 
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
                          <div className="mt-3 flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => verImagenEnLinea(selectedPromocion.imageUrl!)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                              title="Ver imagen en línea"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver en línea
                            </button>
                            <button
                              onClick={() => descargarImagen(selectedPromocion.imageUrl!, `promocion-${selectedPromocion.businessName}`)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                              title="Descargar imagen"
                            >
                              <Download className="w-3 h-3" />
                              Descargar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Información técnica */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    Información Técnica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID de Promoción</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedPromocion.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID del Negocio</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedPromocion.businessId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Creación</label>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedPromocion.createdAt)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Última Actualización</label>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedPromocion.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center mt-6 pt-4 border-t">
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

      {/* Mensaje cuando no hay promociones */}
      {!loading && promocionesPaginadas.length === 0 && totalElements === 0 && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay promociones disponibles</h3>
          <p className="text-gray-500 mb-4">
            {error ?
              'Hubo un problema al cargar las promociones desde el servidor.' :
              'Aún no hay promociones registradas en el sistema.'
            }
          </p>
          {!error && apiPromocion.isAuthenticated() && (
            <button
              onClick={recargarDatos}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Recargar promociones
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Promociones;