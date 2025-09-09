import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, Search, Filter, Calendar, User, TrendingDown, Eye, Edit, Check, X, ChevronLeft, ChevronRight, FileText, Download, MessageSquare, Send, ZoomIn, ZoomOut, RotateCw, AlertTriangle } from 'lucide-react';
import { ApiService } from './login/ApiService'; 
import '../styles/eliminar.css';
import { apiEliminacion, ApiEliminacion } from './login/ApiEliminacion';

// Usar la misma instancia global del servicio
const apiService = new ApiService();

// Interfaces para eliminación
interface RegistroEliminar {
  id: string;
  nombre: string;
  descripcion: string;
  estado?: 'pendiente-eliminacion' | 'eliminado' | 'rechazado-eliminacion' | 'cancelado';
  fechaSolicitud?: string;
  solicitante?: string;
  motivo?: string;
  categoria?: string;
  email?: string;
  cedula?: string;
  telefono?: string;
  address?: string;
  fechaCreacion?: string;
  ultimaModificacion?: string;
}

interface EstadisticasEliminacion {
  totalSolicitudes: number;
  pendientes: number;
  eliminados: number;
  rechazados: number;
}

const Eliminar: React.FC = () => {
  // Estados para datos
  const [registros, setRegistros] = useState<RegistroEliminar[]>([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState<RegistroEliminar[]>([]);
  const [stats, setStats] = useState<EstadisticasEliminacion>({
    totalSolicitudes: 0,
    pendientes: 0,
    eliminados: 0,
    rechazados: 0
  });
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Estados para UI
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');
  
  // Estados para nueva solicitud de eliminación
  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    nombre: '',
    descripcion: '',
    motivo: '',
    categoria: '',
    email: '',
    cedula: '',
    telefono: '',
    address: ''
  });

  // Estados para modales
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroEliminar | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Función unificada para verificar token
  const verificarToken = (): boolean => {
    const token = apiService.getCurrentToken();
    const isAuth = apiService.isAuthenticated();
    
    if (!isAuth || !token) {
      setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
      return false;
    }
    
    if (apiService.isTokenExpired()) {
      setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      apiService.clearToken();
      return false;
    }
    
    return true;
  };

  // Cargar solicitudes de eliminación
  const loadSolicitudesEliminacion = async (page: number = currentPage, size: number = pageSize) => {
    try {
      setLoading(true);
      setError('');
      
      if (!verificarToken()) {
        setLoading(false);
        return;
      }
      
      const response = await apiEliminacion.getSolicitudesEliminacion(undefined, page, size);
      
      if (response.success && response.data) {
        // Manejar respuesta directa del array
        const solicitudesLimpias = Array.isArray(response.data) 
          ? response.data.filter(solicitud => solicitud && solicitud.id)
          : [];
        
        const solicitudesNormalizadas = solicitudesLimpias.map(solicitud => {
          return {
            id: solicitud.id?.toString() || '',
            nombre: solicitud.nombre || '',
            descripcion: solicitud.descripcion || '',
            estado: ApiEliminacion.mapearEstado(solicitud.estado || 'PENDING'),
            fechaSolicitud: solicitud.fechaSolicitud || '',
            solicitante: solicitud.solicitante || '',
            motivo: solicitud.motivo || '',
            categoria: solicitud.categoria || '',
            email: solicitud.email || '',
            cedula: solicitud.cedula || '',
            telefono: solicitud.telefono || '',
            address: solicitud.address || '',
            fechaCreacion: solicitud.fechaSolicitud || '',
            ultimaModificacion: solicitud.fechaProcesamiento || ''
          } as RegistroEliminar;
        });
        
        setRegistros(solicitudesNormalizadas);
        // Para paginación, usar valores por defecto si no existen
        setTotalPages(1);
        setTotalElements(solicitudesLimpias.length);
        setCurrentPage(0);
        
        setTimeout(() => filtrarRegistros(), 0);
        setRenderError('');
        
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
          apiService.clearToken();
          window.location.reload();
        } else {
          setError(response.error || response.message || 'Error al cargar solicitudes de eliminación');
        }
        setRegistros([]);
      }
    } catch (err) {
      setError('Error de conexión al cargar solicitudes de eliminación. Verifique su conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas de eliminación
  const loadEstadisticasEliminacion = async () => {
    try {
      if (!verificarToken()) return;

      const response = await apiEliminacion.getEstadisticasEliminacion();

      if (response.success && response.data) {
        const data = response.data;
        setStats({
          totalSolicitudes: Number(data.totalSolicitudes || 0),
          pendientes: Number(data.pendientes || 0),
          eliminados: Number(data.eliminados || 0),
          rechazados: Number(data.rechazados || 0)
        });
      }
    } catch (e) {
      console.warn('No se pudieron cargar estadísticas de eliminación');
    }
  };

  // Confirmar eliminación
  const confirmarEliminacion = async (registroId: string) => {
    try {
      if (!verificarToken()) return;
      
      setLoading(true);
      const response = await apiEliminacion.aprobarEliminacion(parseInt(registroId), 'Aprobación administrativa');
      
      if (response.success) {
        setShowConfirmModal(false);
        setSelectedRegistro(null);
        await loadSolicitudesEliminacion();
        setTimeout(() => filtrarRegistros(), 100);
        loadEstadisticasEliminacion();
        alert('Registro eliminado exitosamente');
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al eliminar registro');
        }
      }
    } catch (err) {
      alert('Error de conexión al eliminar registro');
    } finally {
      setLoading(false);
    }
  };

  // Rechazar solicitud de eliminación
  const rechazarEliminacion = async () => {
    if (!selectedRegistro) return;
    
    if (!motivoRechazo.trim()) {
      alert('Por favor, ingrese el motivo del rechazo.');
      return;
    }

    if (motivoRechazo.trim().length < 10) {
      alert('El motivo debe tener al menos 10 caracteres.');
      return;
    }
    
    try {
      if (!verificarToken()) return;
      
      setLoading(true);
      const response = await apiEliminacion.rechazarEliminacion(parseInt(selectedRegistro.id), motivoRechazo.trim());
      
      if (response.success) {
        setShowRejectModal(false);
        setMotivoRechazo('');
        setSelectedRegistro(null);
        
        await loadSolicitudesEliminacion();
        setTimeout(() => filtrarRegistros(), 100);
        loadEstadisticasEliminacion();
        
        alert(`Solicitud de eliminación rechazada. ${response.message || 'Se ha enviado la notificación.'}`);
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al rechazar solicitud');
        }
      }
    } catch (err) {
      alert('Error de conexión al rechazar solicitud. Verifique su conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva solicitud de eliminación
  const crearSolicitudEliminacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nuevaSolicitud.nombre.trim() || !nuevaSolicitud.motivo.trim()) {
      alert('Nombre y motivo son requeridos');
      return;
    }
    
    try {
      if (!verificarToken()) return;
      
      setLoading(true);
      const solicitudData = {
        nombre: nuevaSolicitud.nombre.trim(),
        descripcion: nuevaSolicitud.descripcion.trim(),
        motivo: nuevaSolicitud.motivo.trim(),
        categoria: nuevaSolicitud.categoria.trim() || undefined,
        email: nuevaSolicitud.email.trim() || undefined,
        cedula: nuevaSolicitud.cedula.trim() || undefined,
        telefono: nuevaSolicitud.telefono.trim() || undefined,
        address: nuevaSolicitud.address.trim() || undefined
      };
      
      const response = await apiEliminacion.createSolicitudEliminacion(solicitudData);
      
      if (response.success) {
        setShowModal(false);
        setNuevaSolicitud({
          nombre: '',
          descripcion: '',
          motivo: '',
          categoria: '',
          email: '',
          cedula: '',
          telefono: '',
          address: ''
        });
        await loadSolicitudesEliminacion();
        alert('Solicitud de eliminación creada exitosamente');
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al crear solicitud de eliminación');
        }
      }
    } catch (err) {
      alert('Error de conexión al crear solicitud');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar página
  const changePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      loadSolicitudesEliminacion(newPage, pageSize);
    }
  };

  // Cambiar tamaño de página
  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadSolicitudesEliminacion(0, newSize);
  };

  // Función para filtrar registros
  const filtrarRegistros = useCallback(() => {
    let registrosFiltrados = registros;

    if (filterStatus !== 'all') {
      registrosFiltrados = registrosFiltrados.filter(registro => 
        registro.estado === filterStatus
      );
    }

    if (searchTerm.trim() !== '') {
      const terminoBusqueda = searchTerm.toLowerCase();
      registrosFiltrados = registrosFiltrados.filter(registro => 
        (registro.nombre && registro.nombre.toLowerCase().includes(terminoBusqueda)) ||
        (registro.email && registro.email.toLowerCase().includes(terminoBusqueda)) ||
        (registro.cedula && registro.cedula.toLowerCase().includes(terminoBusqueda)) ||
        (registro.telefono && registro.telefono.toLowerCase().includes(terminoBusqueda)) ||
        (registro.motivo && registro.motivo.toLowerCase().includes(terminoBusqueda)) ||
        (registro.categoria && registro.categoria.toLowerCase().includes(terminoBusqueda))
      );
    }

    setRegistrosFiltrados(registrosFiltrados);
  }, [registros, filterStatus, searchTerm]);

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    setCurrentPage(0);
    setTimeout(() => filtrarRegistros(), 0);
  };

  // Efectos
  useEffect(() => {
    const inicializar = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!verificarToken()) {
        setError('No hay sesión válida. Por favor, inicie sesión.');
        return;
      }
      
      loadSolicitudesEliminacion();
      loadEstadisticasEliminacion();
    };
    
    inicializar();
  }, []);

  useEffect(() => {
    if (!apiService.isAuthenticated()) return;
    
    const delayedSearch = setTimeout(() => {
      filtrarRegistros();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filtrarRegistros]);

  useEffect(() => {
    if (registros.length > 0) {
      filtrarRegistros();
    }
  }, [registros, filtrarRegistros]);

  const getStatusColor = (estado: string | undefined): string => {
    if (!estado) return 'bg-gray-100 text-gray-800';
    
    switch (estado) {
      case 'pendiente-eliminacion': return 'bg-orange-100 text-orange-800';
      case 'eliminado': return 'bg-red-100 text-red-800';
      case 'rechazado-eliminacion': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstadoText = (estado: string | undefined) => {
    if (!estado) return 'Sin estado';
    
    switch (estado) {
      case 'pendiente-eliminacion': return 'Pendiente Eliminación';
      case 'eliminado': return 'Eliminado';
      case 'rechazado-eliminacion': return 'Rechazado';
      case 'cancelado': return 'Cancelado';
      default: return estado.charAt(0).toUpperCase() + estado.slice(1).replace('-', ' ');
    }
  };

  // Función para renderizar registros de forma segura
  const renderRegistros = () => {
    try {
      return registrosFiltrados.map((registro) => {
        if (!registro || !registro.id) {
          return null;
        }

        const estadoRegistro = registro.estado || 'pendiente-eliminacion';

        return (
          <div key={registro.id} className="eliminar-card">
            <div className="eliminar-card-header">
              <div className="eliminar-card-title-group">
                <div className="eliminar-card-icon">
                  <Trash2 />
                </div>
                <div>
                  <h3 className="eliminar-card-name">
                    {registro.nombre || `Solicitud #${registro.id}`}
                  </h3>
                  <p className="eliminar-card-category">{registro.categoria || 'General'}</p>
                </div>
              </div>
              <span className={`eliminar-card-status ${getStatusColor(estadoRegistro)}`}>
                {formatEstadoText(estadoRegistro)}
              </span>
            </div>

            <div className="eliminar-details-grid">
              <div>
                <p className="eliminar-detail-label">Motivo de Eliminación</p>
                <p className="eliminar-detail-value">
                  <AlertTriangle className="eliminar-detail-icon" />
                  {registro.motivo || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="eliminar-detail-label">Correo Electrónico</p>
                <p className="eliminar-detail-value">
                  <User className="eliminar-detail-icon" />
                  {registro.email || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="eliminar-detail-label">Número de Cédula</p>
                <p className="eliminar-detail-value">
                  {registro.cedula || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="eliminar-detail-label">Fecha de Solicitud</p>
                <p className="eliminar-detail-value">
                  <Calendar className="eliminar-detail-icon" />
                  {registro.fechaSolicitud ? new Date(registro.fechaSolicitud).toLocaleDateString() : 'No especificado'}
                </p>
              </div>
            </div>

            <div className="eliminar-card-footer">
              {estadoRegistro === 'pendiente-eliminacion' ? (
                <>
                  <button 
                    onClick={() => {
                      setSelectedRegistro(registro);
                      setShowConfirmModal(true);
                    }}
                    className="eliminar-action-button bg-red-600 hover:bg-red-700 text-white"
                    disabled={loading || !apiService.isAuthenticated()}
                    title="Confirmar eliminación"
                  >
                    <Check className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedRegistro(registro);
                      setMotivoRechazo('');
                      setShowRejectModal(true);
                    }}
                    className="eliminar-action-button bg-yellow-600 hover:bg-yellow-700 text-white"
                    disabled={loading || !apiService.isAuthenticated()}
                    title="Rechazar solicitud"
                  >
                    <X className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setSelectedRegistro(registro);
                      setShowViewModal(true);
                    }}
                    className="eliminar-action-button bg-blue-600 hover:bg-blue-700 text-white"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      }).filter(Boolean);
    } catch (renderErr) {
      const errorMessage = renderErr instanceof Error ? renderErr.message : 'Error desconocido';
      if (renderError !== errorMessage) {
        setTimeout(() => {
          setRenderError(errorMessage);
        }, 0);
      }
      
      return [
        <div key="error" className="col-span-full text-center py-8">
          <p className="text-red-600">Error al mostrar las solicitudes. Revise la consola para más detalles.</p>
        </div>
      ];
    }
  };

  return (
    <div className="eliminar-container">
      <div className="eliminar-header">
        <h1 className="eliminar-title">
          <Trash2 className="w-8 h-8 text-red-600 mr-3" />
          Gestión de Eliminaciones
        </h1>
        <p className="eliminar-subtitle">
          Administración de solicitudes de eliminación de registros
        </p>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-lg mr-2">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
            <div className="flex gap-2">
              {error.includes('sesión') && (
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Recargar página
                </button>
              )}
              <button 
                onClick={() => {
                  setError('');
                  if (apiService.isAuthenticated()) {
                    loadSolicitudesEliminacion();
                  }
                }} 
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="eliminar-stats-grid">
        <div className="eliminar-stat-card">
          <div className="eliminar-stat-content">
            <div>
              <p className="eliminar-stat-text-sm">Total Solicitudes</p>
              <p className="eliminar-stat-text-lg">{stats.totalSolicitudes}</p>
            </div>
            <div className="eliminar-stat-icon-container bg-gray-100">
              <Trash2 className="eliminar-stat-icon text-gray-600" />
            </div>
          </div>
        </div>
        <div className="eliminar-stat-card">
          <div className="eliminar-stat-content">
            <div>
              <p className="eliminar-stat-text-sm">Pendientes</p>
              <p className="eliminar-stat-text-lg">{stats.pendientes}</p>
            </div>
            <div className="eliminar-stat-icon-container bg-orange-100">
              <Calendar className="eliminar-stat-icon text-orange-600" />
            </div>
          </div>
        </div>
        <div className="eliminar-stat-card">
          <div className="eliminar-stat-content">
            <div>
              <p className="eliminar-stat-text-sm">Eliminados</p>
              <p className="eliminar-stat-text-lg">{stats.eliminados}</p>
            </div>
            <div className="eliminar-stat-icon-container bg-red-100">
              <TrendingDown className="eliminar-stat-icon text-red-600" />
            </div>
          </div>
        </div>
        <div className="eliminar-stat-card">
          <div className="eliminar-stat-content">
            <div>
              <p className="eliminar-stat-text-sm">Rechazados</p>
              <p className="eliminar-stat-text-lg">{stats.rechazados}</p>
            </div>
            <div className="eliminar-stat-icon-container bg-yellow-100">
              <X className="eliminar-stat-icon text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="eliminar-filters">
        <div className="eliminar-filters-container">
          <div className="eliminar-search-container">
            <Search className="eliminar-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, cédula, motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="eliminar-search-input"
              disabled={!apiService.isAuthenticated() || loading}
            />
          </div>

          <div className="eliminar-filters-actions">
            <div className="eliminar-filter-group">
              <Filter className="eliminar-filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="eliminar-filter-select"
                disabled={!apiService.isAuthenticated() || loading}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente-eliminacion">Pendiente Eliminación</option>
                <option value="eliminado">Eliminado</option>
                <option value="rechazado-eliminacion">Rechazado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="eliminar-filter-group">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(parseInt(e.target.value))}
                className="eliminar-filter-select"
                disabled={!apiService.isAuthenticated() || loading}
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="eliminar-add-button"
              disabled={loading || !apiService.isAuthenticated()}
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Solicitud</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2 text-gray-600">
            {registros.length === 0 ? 'Cargando solicitudes...' : 'Actualizando...'}
          </span>
        </div>
      )}

      {/* Error de renderizado */}
      {renderError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-lg mr-2">💥</span>
            <span>Error al renderizar solicitudes: {renderError}</span>
          </div>
        </div>
      )}
      
      {/* Indicador de registros filtrados */}
      {!loading && registrosFiltrados.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {registrosFiltrados.length} de {registros.length} solicitudes
          {filterStatus !== 'all' && ` (filtrado por: ${formatEstadoText(filterStatus)})`}
          {searchTerm && ` (búsqueda: "${searchTerm}")`}
        </div>
      )}

      {/* Lista de solicitudes */}
      <div className="eliminar-grid">
        {!loading && registrosFiltrados.length === 0 && registros.length > 0 && (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-500">
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron solicitudes</p>
              <p className="text-sm">
                {filterStatus !== 'all' 
                  ? `No hay solicitudes con estado "${formatEstadoText(filterStatus)}"`
                  : searchTerm 
                    ? `No hay solicitudes que coincidan con "${searchTerm}"`
                    : 'No hay solicitudes registradas'
                }
              </p>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSearchTerm('');
                  filtrarRegistros();
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
        {!loading && renderRegistros()}
      </div>

      {/* Mensaje cuando no hay solicitudes */}
      {!loading && !renderError && registros.length === 0 && (
        <div className="text-center py-12">
          <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes de eliminación</h3>
          <p className="text-gray-500 mb-4">
            {error ? 
              'Hubo un problema al cargar las solicitudes.' :
              searchTerm || filterStatus !== 'all' ? 
                'No se encontraron solicitudes con los filtros aplicados.' : 
                'Aún no hay solicitudes de eliminación registradas.'
            }
          </p>
          {!error && apiService.isAuthenticated() && (
            <button
              onClick={() => loadSolicitudesEliminacion()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Recargar solicitudes
            </button>
          )}
        </div>
      )}

      {/* Paginación */}
      {!loading && !renderError && totalPages > 1 && (
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
                  {Math.min((currentPage + 1) * pageSize, totalElements)}
                </span>
                {' '}de{' '}
                <span className="font-medium">{totalElements}</span>
                {' '}solicitudes
              </p>
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 0 || !apiService.isAuthenticated() || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
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
                
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1 || !apiService.isAuthenticated() || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal para nueva solicitud de eliminación */}
      {showModal && (
        <div className="eliminar-modal-overlay">
          <div className="eliminar-modal">
            <h2 className="eliminar-modal-title">Nueva Solicitud de Eliminación</h2>
            <form onSubmit={crearSolicitudEliminacion} className="eliminar-modal-form">
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Nombre del Registro a Eliminar *</label>
                <input
                  type="text"
                  value={nuevaSolicitud.nombre}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, nombre: e.target.value})}
                  className="eliminar-form-input"
                  placeholder="Ingrese el nombre del registro"
                  required
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Motivo de Eliminación *</label>
                <textarea
                  value={nuevaSolicitud.motivo}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, motivo: e.target.value})}
                  className="eliminar-form-textarea"
                  rows={3}
                  placeholder="Explique por qué debe eliminarse este registro"
                  required
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Descripción</label>
                <textarea
                  value={nuevaSolicitud.descripcion}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, descripcion: e.target.value})}
                  className="eliminar-form-textarea"
                  rows={2}
                  placeholder="Descripción adicional del registro"
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Categoría</label>
                <input
                  type="text"
                  value={nuevaSolicitud.categoria}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, categoria: e.target.value})}
                  className="eliminar-form-input"
                  placeholder="Categoría del registro"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Correo Electrónico</label>
                <input
                  type="email"
                  value={nuevaSolicitud.email}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, email: e.target.value})}
                  className="eliminar-form-input"
                  placeholder="correo@ejemplo.com"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Número de Cédula</label>
                <input
                  type="text"
                  value={nuevaSolicitud.cedula}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, cedula: e.target.value})}
                  className="eliminar-form-input"
                  placeholder="1234567890"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Número de Teléfono</label>
                <input
                  type="tel"
                  value={nuevaSolicitud.telefono}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, telefono: e.target.value})}
                  className="eliminar-form-input"
                  placeholder="0987654321"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="eliminar-form-group">
                <label className="eliminar-form-label">Dirección</label>
                <textarea
                  value={nuevaSolicitud.address}
                  onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, address: e.target.value})}
                  className="eliminar-form-textarea"
                  rows={2}
                  placeholder="Ingrese la dirección"
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="eliminar-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="eliminar-cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="eliminar-submit-button"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  {loading ? 'Creando...' : 'Crear Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación */}
      {showConfirmModal && selectedRegistro && (
        <div className="eliminar-modal-overlay">
          <div className="eliminar-modal max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="eliminar-modal-title text-red-600">
                <AlertTriangle className="inline w-6 h-6 mr-2" />
                Confirmar Eliminación
              </h2>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedRegistro(null);
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-600 font-medium">¡Acción Irreversible!</span>
              </div>
              <p className="text-sm text-red-800">
                Esta acción eliminará permanentemente el registro "{selectedRegistro.nombre}". 
                No podrá deshacerse esta operación.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <span className="font-medium text-gray-700">Registro:</span>
                <p className="text-gray-900">{selectedRegistro.nombre}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Motivo:</span>
                <p className="text-gray-900">{selectedRegistro.motivo || 'No especificado'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID:</span>
                <p className="text-gray-900 font-mono text-xs">{selectedRegistro.id}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedRegistro(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              
              <button
                onClick={() => confirmarEliminacion(selectedRegistro.id)}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rechazar solicitud */}
      {showRejectModal && selectedRegistro && (
        <div className="eliminar-modal-overlay">
          <div className="eliminar-modal max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="eliminar-modal-title text-yellow-600">
                <MessageSquare className="inline w-6 h-6 mr-2" />
                Rechazar Solicitud de Eliminación
              </h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRegistro(null);
                  setMotivoRechazo('');
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <span className="text-yellow-600 font-medium">Solicitud a rechazar:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Registro:</span>
                  <p className="text-gray-900">{selectedRegistro.nombre}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Motivo Original:</span>
                  <p className="text-gray-900">{selectedRegistro.motivo || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p className="text-gray-900">{selectedRegistro.email || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ID:</span>
                  <p className="text-gray-900 font-mono text-xs">{selectedRegistro.id}</p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              rechazarEliminacion();
            }}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Motivo del Rechazo *
                  <span className="text-xs text-gray-500 ml-1">(Mínimo 10, máximo 500 caracteres)</span>
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setMotivoRechazo(e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors ${
                    motivoRechazo.trim().length >= 10 
                      ? 'border-gray-300 focus:ring-yellow-500' 
                      : 'border-yellow-300 focus:ring-yellow-400'
                  }`}
                  rows={6}
                  placeholder="Explique las razones del rechazo, documentación faltante, requisitos no cumplidos, o mejoras necesarias..."
                  required
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${
                    motivoRechazo.trim().length >= 10 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {motivoRechazo.trim().length >= 10 ? '✓ Longitud válida' : 'Mínimo 10 caracteres requeridos'}
                  </span>
                  <span className={`text-xs ${motivoRechazo.length > 450 ? 'text-red-600' : 'text-gray-500'}`}>
                    {motivoRechazo.length}/500 caracteres
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRegistro(null);
                    setMotivoRechazo('');
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || motivoRechazo.trim().length < 10}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando Rechazo...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Rechazo
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-blue-600 mr-2">💡</span>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Importante:</p>
                  <p>
                    El solicitante recibirá una notificación con su motivo de rechazo. 
                    Sea específico sobre los cambios o requisitos necesarios.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalles */}
      {showViewModal && selectedRegistro && (
        <div className="eliminar-modal-overlay">
          <div className="eliminar-modal max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="eliminar-modal-title">Detalles de la Solicitud</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Registro
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.nombre || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRegistro.estado)}`}>
                    {formatEstadoText(selectedRegistro.estado)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.categoria || 'General'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Solicitud
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.fechaSolicitud ? new Date(selectedRegistro.fechaSolicitud).toLocaleDateString() : 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.email || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cédula
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.cedula || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Teléfono
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.telefono || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedRegistro.address || 'No especificado'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de Eliminación
                </label>
                <p className="text-sm text-gray-900 bg-yellow-50 p-3 rounded min-h-[60px] border border-yellow-200">
                  {selectedRegistro.motivo || 'Sin motivo especificado'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded min-h-[80px]">
                  {selectedRegistro.descripcion || 'Sin descripción disponible'}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs max-w-xs">
          <p>Debug Info:</p>
          <p>Auth: {apiService.isAuthenticated() ? '✅' : '❌'}</p>
          <p>Token: {apiService.getCurrentToken() ? '✅' : '❌'}</p>
          <p>Expired: {apiService.isTokenExpired() ? '❌' : '✅'}</p>
          <p>Solicitudes: {registros.length}</p>
          <p>Render Error: {renderError ? '❌' : '✅'}</p>
          {renderError && <p className="text-red-300 text-xs">Error: {renderError}</p>}
        </div>
      )}
    </div>
  );
};

export default Eliminar;