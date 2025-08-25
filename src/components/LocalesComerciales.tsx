import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Filter, MapPin, Phone, Mail, Eye, Edit, Trash2, Building, User, Calendar, FileText, Download, MessageSquare, Send, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ApiService } from './login/ApiService';
import '../styles/localesComerciales.css';

// Usar la misma instancia global del servicio
const apiService = new ApiService();

// Interfaces basadas en la respuesta de la API
interface BusinessUser {
  id: number;
  name: string;
  email: string;
  identification: string;
}

interface BusinessCategory {
  id: number;
  name: string;
  description: string | null;
}

interface BusinessAPI {
  id: number;
  commercialName: string;
  representativeName: string;
  cedulaOrRuc: string;
  phone: string;
  email: string;
  parishCommunitySector: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  description: string;
  productsServices: string | null;
  acceptsWhatsappOrders: boolean;
  deliveryService: 'BAJO_PEDIDO' | 'DISPONIBLE' | 'NO_DISPONIBLE';
  salePlace: 'FERIAS' | 'LOCAL' | 'DOMICILIO' | 'ONLINE';
  receivedUdelSupport: boolean | null;
  udelSupportDetails: string | null;
  signatureUrl: string | null;
  registrationDate: string | null;
  cedulaFileUrl: string | null;
  logoUrl: string | null;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  user: BusinessUser;
  category: BusinessCategory;
}

interface BusinessStats {
  totalNegocios: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

interface PaginatedBusinessResponse {
  page: number;
  content: BusinessAPI[];
  size: number;
  totalElements: number;
  totalPages: number;
}

// Interfaces para documentos
interface DocumentoNegocio {
  cedula?: string;
  logo?: string;
  signature?: string;
}

// Función para validar y normalizar estados
const validarEstadoNegocio = (estado: string | undefined): 'PENDING' | 'APPROVED' | 'REJECTED' => {
  if (!estado) return 'PENDING';

  const estadoUpper = estado.toUpperCase();

  switch (estadoUpper) {
    case 'PENDING':
    case 'PENDIENTE':
      return 'PENDING';
    case 'APPROVED':
    case 'APROBADO':
      return 'APPROVED';
    case 'REJECTED':
    case 'RECHAZADO':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
};

const LocalesComerciales: React.FC = () => {
  // Estados para datos
  const [negocios, setNegocios] = useState<BusinessAPI[]>([]);
  const [negociosFiltrados, setNegociosFiltrados] = useState<BusinessAPI[]>([]);
  const [stats, setStats] = useState<BusinessStats>({
    totalNegocios: 0,
    pendientes: 0,
    aprobados: 0,
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

  // Estados para nuevo negocio
  const [newNegocio, setNewNegocio] = useState({
    commercialName: '',
    representativeName: '',
    cedulaOrRuc: '',
    phone: '',
    email: '',
    parishCommunitySector: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    website: '',
    description: '',
    productsServices: '',
    acceptsWhatsappOrders: false,
    deliveryService: 'BAJO_PEDIDO' as 'BAJO_PEDIDO' | 'DISPONIBLE' | 'NO_DISPONIBLE',
    salePlace: 'LOCAL' as 'FERIAS' | 'LOCAL' | 'DOMICILIO' | 'ONLINE',
    categoryId: 1
  });

  // Estados para modales
  const [selectedNegocio, setSelectedNegocio] = useState<BusinessAPI | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estados para documentos y observaciones - AGREGADOS
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [currentDocuments, setCurrentDocuments] = useState<DocumentoNegocio>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string>('');

  // Función unificada para verificar token
  const verificarToken = (): boolean => {
    console.log('🔍 Verificando estado de autenticación...');

    const token = apiService.getCurrentToken();
    const isAuth = apiService.isAuthenticated();

    console.log('🔑 Token actual:', token ? `${token.substring(0, 50)}...` : 'NO HAY TOKEN');
    console.log('🔑 Token actual:', token);
    console.log('✅ ¿Está autenticado?:', isAuth);

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

  // Función para cargar documentos del negocio
  const cargarDocumentos = async (businessId: number) => {
    try {
      if (!verificarToken()) return;

      setLoadingDocuments(true);
      setDocumentError('');

      console.log('📄 Cargando documentos para negocio:', businessId);

      // Buscar el negocio en la lista actual para obtener URLs
      const negocio = negocios.find(n => n.id === businessId);
      if (!negocio) {
        setDocumentError('Negocio no encontrado');
        return;
      }

      const documents: DocumentoNegocio = {};

      // Procesar cédula si existe
      if (negocio.cedulaFileUrl) {
        try {
          // Si ya es una URL válida, usar directamente
          if (negocio.cedulaFileUrl.startsWith('http')) {
            documents.cedula = negocio.cedulaFileUrl;
            console.log('✅ URL de cédula disponible');
          }
        } catch (err) {
          console.warn('⚠️ Error procesando cédula:', err);
        }
      }

      // Procesar logo si existe
      if (negocio.logoUrl) {
        try {
          if (negocio.logoUrl.startsWith('http')) {
            documents.logo = negocio.logoUrl;
            console.log('✅ URL de logo disponible');
          }
        } catch (err) {
          console.warn('⚠️ Error procesando logo:', err);
        }
      }

      // Procesar firma si existe
      if (negocio.signatureUrl) {
        try {
          if (negocio.signatureUrl.startsWith('http')) {
            documents.signature = negocio.signatureUrl;
            console.log('✅ URL de firma disponible');
          }
        } catch (err) {
          console.warn('⚠️ Error procesando firma:', err);
        }
      }

      setCurrentDocuments(documents);

      // Verificar si al menos un documento se cargó
      const hasDocuments = Object.values(documents).some(doc => doc);
      if (!hasDocuments) {
        setDocumentError('No se encontraron documentos para este negocio.');
      }

    } catch (err) {
      console.error('💥 Error cargando documentos:', err);
      setDocumentError('Error al cargar los documentos del negocio.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Función para abrir ventana de documentos
  const abrirDocumentos = async (negocio: BusinessAPI) => {
    setSelectedNegocio(negocio);
    setShowDocumentsModal(true);
    await cargarDocumentos(negocio.id);
  };

  // Función para manejar rechazo con observación
  const iniciarRechazo = (negocio: BusinessAPI) => {
    setSelectedNegocio(negocio);
    setObservationText('');
    setShowObservationModal(true);
  };

  // Función para enviar rechazo con observación
  const enviarRechazo = async () => {
    if (!selectedNegocio) return;

    if (!observationText.trim()) {
      alert('Por favor, ingrese una observación para el rechazo.');
      return;
    }

    try {
      if (!verificarToken()) return;

      setLoading(true);
      console.log('❌ Rechazando negocio con observación:', {
        negocioId: selectedNegocio.id,
        observacion: observationText.trim()
      });

      // Rechazar el negocio
      const response = await apiService.request<{ message: string }>(`/business/reject/${selectedNegocio.id}`, {
        method: 'POST',
        body: JSON.stringify({
          observacion: observationText.trim(),
          timestamp: new Date().toISOString()
        })
      });

      console.log('📡 Respuesta de rechazo:', response);

      if (response.success) {
        console.log('✅ Negocio rechazado exitosamente');

        // Cerrar modal de observación
        setShowObservationModal(false);
        setObservationText('');
        setSelectedNegocio(null);

        // Recargar negocios
        await loadNegocios();
        setTimeout(() => filtrarNegocios(), 100);

        alert('Mensaje enviado. El negocio ha sido rechazado con la observación correspondiente.');

      } else {
        console.error('❌ Error al rechazar:', response.error);
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else if (response.status === 403) {
          alert('No tiene permisos para rechazar negocios');
        } else if (response.status === 404) {
          alert('Negocio no encontrado o endpoint no disponible');
        } else {
          alert(response.error || 'Error al rechazar negocio');
        }
      }
    } catch (err) {
      console.error('💥 Error de conexión al rechazar negocio:', err);
      alert('Error de conexión al rechazar negocio');
    } finally {
      setLoading(false);
    }
  };

  // Cargar negocios desde la API
  const loadNegocios = async (page: number = currentPage, size: number = pageSize) => {
    try {
      setLoading(true);
      setError('');

      console.log('🚀 Iniciando carga de negocios...');

      if (!verificarToken()) {
        setLoading(false);
        return;
      }

      console.log('📊 Parámetros de consulta:', { page, size, searchTerm });

      // Usar endpoint específico para listar negocios públicos
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      console.log('🔍 Usando endpoint de negocios públicos...');
      const response: any = await apiService.request<PaginatedBusinessResponse>(`/business/private-list-by-category?${params}`, {
        method: 'GET'
      });

      ///business/private-list-by-category?page=2&size=5

      console.log('📡 Respuesta de la API:', response);

      if (response.success && response.data.data) {
        console.log('✅ Negocios cargados exitosamente');
        console.log('📋 Cantidad de negocios:', response.data.data.content.length);
        console.log('🔍 Datos de negocios recibidos:', response.data.data.content);

        // Validar y limpiar datos antes de setear
        const negociosLimpios = response.data.data.content.filter((negocio: any) => {
          if (!negocio || !negocio.id) {
            console.warn('⚠️ Negocio filtrado por datos incompletos:', negocio);
            return false;
          }
          return true;
        });

        console.log('📋 Negocios después del filtrado:', negociosLimpios.length);

        setNegocios(negociosLimpios);
        setTotalPages(response.data.data.totalPages);
        setTotalElements(response.data.data.totalElements);
        setCurrentPage(response.data.data.page - 1); // La API devuelve page base 1, convertir a base 0

        // Aplicar filtros después de cargar los negocios
        setTimeout(() => filtrarNegocios(), 0);

        // Limpiar error de renderizado cuando carga exitosa
        setRenderError('');

        // Calcular estadísticas
        calculateStats(negociosLimpios, response.data.data.totalElements);

      } else {
        console.error('❌ Error en respuesta:', response.error || response.message);

        if (response.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
          apiService.clearToken();
          window.location.reload();
        } else if (response.status === 403) {
          setError('No tiene permisos para ver los negocios. Contacte al administrador.');
        } else if (response.status === 404) {
          setError('Endpoint no encontrado. Verifique la configuración del servidor.');
        } else {
          setError(response.error || response.message || 'Error al cargar negocios');
        }
        setNegocios([]);
      }
    } catch (err) {
      console.error('💥 Error de conexión al cargar negocios:', err);

      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
          setError('Error de conexión. Verifique que el servidor esté disponible.');
        } else if (err.message.includes('timeout') || err.message.includes('AbortError')) {
          setError('La conexión tardó demasiado tiempo. Intente nuevamente.');
        } else {
          setError(`Error de conexión: ${err.message}`);
        }
      } else {
        setError('Error de conexión al cargar negocios. Verifique su conexión a internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calculateStats = (negociosList: BusinessAPI[], total: number) => {
    const pendientes = negociosList.filter(n => n.validationStatus === 'PENDING').length;
    const aprobados = negociosList.filter(n => n.validationStatus === 'APPROVED').length;
    const rechazados = negociosList.filter(n => n.validationStatus === 'REJECTED').length;

    setStats({
      totalNegocios: total,
      pendientes,
      aprobados,
      rechazados
    });
  };

  // Aprobar negocio
  const aprobarNegocio = async (businessId: number) => {
    try {
      if (!verificarToken()) return;

      setLoading(true);
      console.log('✅ Aprobando negocio:', businessId);

      const response = await apiService.request<BusinessAPI>(`/business/approve/${businessId}`, {
        method: 'POST'
      });

      console.log('📡 Respuesta de aprobación:', response);

      if (response.success) {
        console.log('🎉 Negocio aprobado exitosamente');
        await loadNegocios();
        setTimeout(() => filtrarNegocios(), 100);
        alert('Negocio aprobado exitosamente');
      } else {
        console.error('❌ Error al aprobar:', response.error);
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else if (response.status === 403) {
          alert('No tiene permisos para aprobar negocios');
        } else if (response.status === 404) {
          alert('Negocio no encontrado o endpoint no disponible');
        } else {
          alert(response.error || 'Error al aprobar negocio');
        }
      }
    } catch (err) {
      console.error('💥 Error de conexión al aprobar negocio:', err);
      alert('Error de conexión al aprobar negocio');
    } finally {
      setLoading(false);
    }
  };

  // Crear negocio
  const crearNegocio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNegocio.commercialName.trim() || !newNegocio.representativeName.trim()) {
      alert('Nombre comercial y representante son requeridos');
      return;
    }

    try {
      if (!verificarToken()) return;

      setLoading(true);
      const negocioData = {
        commercialName: newNegocio.commercialName.trim(),
        representativeName: newNegocio.representativeName.trim(),
        cedulaOrRuc: newNegocio.cedulaOrRuc.trim(),
        phone: newNegocio.phone.trim(),
        email: newNegocio.email.trim(),
        parishCommunitySector: newNegocio.parishCommunitySector.trim(),
        facebook: newNegocio.facebook.trim(),
        instagram: newNegocio.instagram.trim(),
        tiktok: newNegocio.tiktok.trim(),
        website: newNegocio.website.trim(),
        description: newNegocio.description.trim(),
        productsServices: newNegocio.productsServices.trim(),
        acceptsWhatsappOrders: newNegocio.acceptsWhatsappOrders,
        deliveryService: newNegocio.deliveryService,
        salePlace: newNegocio.salePlace,
        categoryId: newNegocio.categoryId
      };

      console.log('➕ Creando negocio:', negocioData);

      const response = await apiService.request<BusinessAPI>('/business/create', {
        method: 'POST',
        body: JSON.stringify(negocioData)
      });

      console.log('📡 Respuesta de creación:', response);

      if (response.success) {
        console.log('🎉 Negocio creado exitosamente');
        setShowModal(false);
        setNewNegocio({
          commercialName: '',
          representativeName: '',
          cedulaOrRuc: '',
          phone: '',
          email: '',
          parishCommunitySector: '',
          facebook: '',
          instagram: '',
          tiktok: '',
          website: '',
          description: '',
          productsServices: '',
          acceptsWhatsappOrders: false,
          deliveryService: 'BAJO_PEDIDO',
          salePlace: 'LOCAL',
          categoryId: 1
        });
        await loadNegocios();
        alert('Negocio creado exitosamente');
      } else {
        console.error('❌ Error al crear:', response.error);
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al crear negocio');
        }
      }
    } catch (err) {
      console.error('💥 Error de conexión al crear negocio:', err);
      alert('Error de conexión al crear negocio');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar página
  const changePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      loadNegocios(newPage, pageSize);
    }
  };

  // Cambiar tamaño de página
  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadNegocios(0, newSize);
  };

  // Función para filtrar negocios
  const filtrarNegocios = useCallback(() => {
    let negociosFiltrados = negocios;

    // Filtrar por estado
    if (filterStatus !== 'all') {
      const statusMap: { [key: string]: string } = {
        'activo': 'APPROVED',
        'pendiente': 'PENDING',
        'inactivo': 'REJECTED'
      };
      const apiStatus = statusMap[filterStatus] || filterStatus;
      negociosFiltrados = negociosFiltrados.filter(negocio =>
        negocio.validationStatus === apiStatus
      );
    }

    // Filtrar por búsqueda
    if (searchTerm.trim() !== '') {
      const terminoBusqueda = searchTerm.toLowerCase();
      negociosFiltrados = negociosFiltrados.filter(negocio =>
        (negocio.commercialName && negocio.commercialName.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.representativeName && negocio.representativeName.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.email && negocio.email.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.cedulaOrRuc && negocio.cedulaOrRuc.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.phone && negocio.phone.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.parishCommunitySector && negocio.parishCommunitySector.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.category && negocio.category.name && negocio.category.name.toLowerCase().includes(terminoBusqueda))
      );
    }

    setNegociosFiltrados(negociosFiltrados);
  }, [negocios, filterStatus, searchTerm]);

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    setCurrentPage(0);
    setTimeout(() => filtrarNegocios(), 0);
  };

  // Efecto inicial
  useEffect(() => {
    console.log('🚀 Iniciando componente LocalesComerciales...');
    console.log('🔍 Estado inicial del token:', {
      isAuthenticated: apiService.isAuthenticated(),
      currentToken: apiService.getCurrentToken()?.substring(0, 50) + '...',
      isExpired: apiService.isTokenExpired()
    });

    const inicializar = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!verificarToken()) {
        console.error('❌ No hay token válido, no se cargarán los negocios');
        setError('No hay sesión válida. Por favor, inicie sesión.');
        return;
      }

      console.log('✅ Token válido encontrado, cargando negocios...');
      loadNegocios();
    };

    inicializar();
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (!apiService.isAuthenticated()) return;

    const delayedSearch = setTimeout(() => {
      filtrarNegocios();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filtrarNegocios]);

  // Efecto para aplicar filtros cuando cambien los negocios
  useEffect(() => {
    if (negocios.length > 0) {
      filtrarNegocios();
    }
  }, [negocios, filtrarNegocios]);

  const getStatusColor = (estado: string | undefined): string => {
    if (!estado) return 'bg-gray-100 text-gray-800';

    switch (estado) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (categoria: string | undefined): string => {
    if (!categoria) return 'bg-gray-100 text-gray-800';

    const categoriaLower = categoria.toLowerCase();
    if (categoriaLower.includes('alimento')) return 'bg-orange-100 text-orange-800';
    if (categoriaLower.includes('comercio')) return 'bg-blue-100 text-blue-800';
    if (categoriaLower.includes('salud')) return 'bg-purple-100 text-purple-800';
    if (categoriaLower.includes('servicio')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatEstadoText = (estado: string | undefined) => {
    if (!estado) return 'Sin estado';
    switch (estado) {
      case 'PENDING': return 'Pendiente';
      case 'APPROVED': return 'Aprobado';
      case 'REJECTED': return 'Rechazado';
      default: return estado;
    }
  };

  const formatDeliveryService = (service: string | undefined) => {
    if (!service) return 'No especificado';
    switch (service) {
      case 'BAJO_PEDIDO': return 'Bajo pedido';
      case 'DISPONIBLE': return 'Disponible';
      case 'NO_DISPONIBLE': return 'No disponible';
      default: return service;
    }
  };

  const formatSalePlace = (place: string | undefined) => {
    if (!place) return 'No especificado';
    switch (place) {
      case 'FERIAS': return 'Ferias';
      case 'LOCAL': return 'Local';
      case 'DOMICILIO': return 'Domicilio';
      case 'ONLINE': return 'Online';
      default: return place;
    }
  };

  return (
    <div className="locales-container">
      <div className="locales-header">
        <h1 className="locales-title">
          <Store className="w-8 h-8 text-red-600 mr-3" />
          Locales Comerciales
        </h1>
        <p className="locales-subtitle">
          Registro y gestión de establecimientos comerciales
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
                  onClick={() => {
                    console.log('🔄 Recargando página...');
                    window.location.reload();
                  }}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Recargar página
                </button>
              )}
              <button
                onClick={() => {
                  setError('');
                  if (apiService.isAuthenticated()) {
                    loadNegocios();
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
      <div className="locales-stats-grid">
        <div className="locales-stat-card">
          <div className="locales-stat-content">
            <div>
              <p className="locales-stat-text-sm">Total Locales</p>
              <p className="locales-stat-text-lg">{stats.totalNegocios}</p>
            </div>
            <div className="locales-stat-icon-container bg-blue-100">
              <Store className="locales-stat-icon text-blue-600" />
            </div>
          </div>
        </div>
        <div className="locales-stat-card">
          <div className="locales-stat-content">
            <div>
              <p className="locales-stat-text-sm">Aprobados</p>
              <p className="locales-stat-text-lg">{stats.aprobados}</p>
            </div>
            <div className="locales-stat-icon-container bg-green-100">
              <Building className="locales-stat-icon text-green-600" />
            </div>
          </div>
        </div>
        <div className="locales-stat-card">
          <div className="locales-stat-content">
            <div>
              <p className="locales-stat-text-sm">Pendientes</p>
              <p className="locales-stat-text-lg">{stats.pendientes}</p>
            </div>
            <div className="locales-stat-icon-container bg-yellow-100">
              <Calendar className="locales-stat-icon text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="locales-stat-card">
          <div className="locales-stat-content">
            <div>
              <p className="locales-stat-text-sm">Rechazados</p>
              <p className="locales-stat-text-lg">{stats.rechazados}</p>
            </div>
            <div className="locales-stat-icon-container bg-red-100">
              <X className="locales-stat-icon text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="locales-filters">
        <div className="locales-filters-container">
          <div className="locales-search-container">
            <Search className="locales-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre comercial, representante, email, cédula/RUC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(0);
                  filtrarNegocios();
                }
              }}
              className="locales-search-input"
              disabled={!apiService.isAuthenticated() || loading}
            />
          </div>

          <div className="locales-filters-actions">
            <div className="locales-filter-group">
              <Filter className="locales-filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="locales-filter-select"
                disabled={!apiService.isAuthenticated() || loading}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="activo">Aprobado</option>
                <option value="inactivo">Rechazado</option>
              </select>
            </div>

            <div className="locales-filter-group">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(parseInt(e.target.value))}
                className="locales-filter-select"
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
              className="locales-add-button"
              disabled={loading || !apiService.isAuthenticated()}
            >
              <Plus className="w-5 h-5" />
              <span>Registrar Local</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2 text-gray-600">
            {negocios.length === 0 ? 'Cargando negocios...' : 'Actualizando...'}
          </span>
        </div>
      )}

      {/* Error de renderizado */}
      {renderError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-lg mr-2">💥</span>
            <span>Error al renderizar negocios: {renderError}</span>
          </div>
        </div>
      )}

      {/* Indicador de negocios filtrados */}
      {!loading && negociosFiltrados.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {negociosFiltrados.length} de {negocios.length} negocios
          {filterStatus !== 'all' && ` (filtrado por: ${formatEstadoText(filterStatus === 'activo' ? 'APPROVED' : filterStatus === 'pendiente' ? 'PENDING' : 'REJECTED')})`}
          {searchTerm && ` (búsqueda: "${searchTerm}")`}
        </div>
      )}

      {/* Lista de locales */}
      <div className="locales-list">
        {!loading && negociosFiltrados.length === 0 && negocios.length > 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron negocios</p>
              <p className="text-sm">
                {filterStatus !== 'all'
                  ? `No hay negocios con estado "${formatEstadoText(filterStatus === 'activo' ? 'APPROVED' : filterStatus === 'pendiente' ? 'PENDING' : 'REJECTED')}"`
                  : searchTerm
                    ? `No hay negocios que coincidan con "${searchTerm}"`
                    : 'No hay negocios registrados'
                }
              </p>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSearchTerm('');
                  filtrarNegocios();
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {!loading && negociosFiltrados.map((negocio) => (
          <div key={negocio.id} className="locales-card">
            <div className="locales-card-content">
              <div className="locales-card-main">
                <div className="locales-card-header">
                  <div className="locales-card-icon">
                    <Store />
                  </div>
                  <div className="locales-card-info">
                    <div className="locales-card-title">
                      <h3 className="locales-card-name">{negocio.commercialName || 'Sin nombre comercial'}</h3>
                      <span className={`locales-card-badge ${getCategoryColor(negocio.category?.name)}`}>
                        {negocio.category?.name || 'Sin categoría'}
                      </span>
                      <span className={`locales-card-badge ${getStatusColor(negocio.validationStatus)}`}>
                        {formatEstadoText(negocio.validationStatus)}
                      </span>
                    </div>
                    <p className="locales-card-license">RUC/Cédula: {negocio.cedulaOrRuc || 'No especificado'}</p>
                  </div>
                </div>

                <div className="locales-details-grid">
                  <div className="locales-detail-item">
                    <User className="locales-detail-icon" />
                    <div>
                      <p className="locales-detail-label">Representante</p>
                      <p className="locales-detail-value">{negocio.representativeName || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="locales-detail-item">
                    <MapPin className="locales-detail-icon" />
                    <div>
                      <p className="locales-detail-label">Sector</p>
                      <p className="locales-detail-value">{negocio.parishCommunitySector || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="locales-detail-item">
                    <Phone className="locales-detail-icon" />
                    <div>
                      <p className="locales-detail-label">Teléfono</p>
                      <p className="locales-detail-value">{negocio.phone || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="locales-detail-item">
                    <Mail className="locales-detail-icon" />
                    <div>
                      <p className="locales-detail-label">Email</p>
                      <p className="locales-detail-value">{negocio.email || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="locales-detail-item">
                    <Building className="locales-detail-icon" />
                    <div>
                      <p className="locales-detail-label">Lugar de venta</p>
                      <p className="locales-detail-value">{formatSalePlace(negocio.salePlace)}</p>
                    </div>
                  </div>
                  <div className="locales-detail-item">
                    <Calendar className="locales-detail-icon" />
                    <div>
                      <p className="locales-detail-label">Delivery</p>
                      <p className="locales-detail-value">{formatDeliveryService(negocio.deliveryService)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="locales-card-actions">
                {negocio.validationStatus === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => abrirDocumentos(negocio)}
                      className="locales-action-button bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center gap-2"
                      disabled={loading || !apiService.isAuthenticated()}
                      title="Abrir documentos del negocio"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Abrir</span>
                    </button>
                    <button
                      onClick={() => aprobarNegocio(negocio.id)}
                      className="locales-action-button bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded flex items-center gap-2"
                      disabled={loading || !apiService.isAuthenticated()}
                      title="Aprobar negocio"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprobar</span>
                    </button>
                    <button
                      onClick={() => iniciarRechazo(negocio)}
                      className="locales-action-button bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex items-center gap-2"
                      disabled={loading || !apiService.isAuthenticated()}
                      title="Rechazar negocio"
                    >
                      <X className="w-4 h-4" />
                      <span>Rechazar</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedNegocio(negocio);
                        setShowViewModal(true);
                      }}
                      className="locales-action-button locales-view-button"
                      title="Ver detalles del negocio"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedNegocio(negocio);
                        setNewNegocio({
                          commercialName: negocio.commercialName || '',
                          representativeName: negocio.representativeName || '',
                          cedulaOrRuc: negocio.cedulaOrRuc || '',
                          phone: negocio.phone || '',
                          email: negocio.email || '',
                          parishCommunitySector: negocio.parishCommunitySector || '',
                          facebook: negocio.facebook || '',
                          instagram: negocio.instagram || '',
                          tiktok: negocio.tiktok || '',
                          website: negocio.website || '',
                          description: negocio.description || '',
                          productsServices: negocio.productsServices || '',
                          acceptsWhatsappOrders: negocio.acceptsWhatsappOrders || false,
                          deliveryService: negocio.deliveryService || 'BAJO_PEDIDO',
                          salePlace: negocio.salePlace || 'LOCAL',
                          categoryId: negocio.category?.id || 1
                        });
                        setShowEditModal(true);
                      }}
                      className="locales-action-button locales-edit-button"
                      title="Editar negocio"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('¿Está seguro que desea eliminar este negocio? Esta acción no se puede deshacer.')) {
                          return;
                        }

                        try {
                          if (!verificarToken()) return;

                          setLoading(true);
                          console.log('🗑️ Eliminando negocio:', negocio.id);

                          const response = await apiService.request<{ message: string }>(`/business/${negocio.id}`, {
                            method: 'DELETE'
                          });

                          console.log('📡 Respuesta de eliminación:', response);

                          if (response.success) {
                            console.log('🎉 Negocio eliminado exitosamente');
                            await loadNegocios();
                            alert('Negocio eliminado exitosamente');
                          } else {
                            console.error('❌ Error al eliminar:', response.error);
                            if (response.status === 401) {
                              setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
                              apiService.clearToken();
                            } else if (response.status === 403) {
                              alert('No tiene permisos para eliminar negocios');
                            } else if (response.status === 404) {
                              alert('Negocio no encontrado');
                            } else {
                              alert(response.error || 'Error al eliminar negocio');
                            }
                          }
                        } catch (err) {
                          console.error('💥 Error de conexión al eliminar negocio:', err);
                          alert('Error de conexión al eliminar negocio');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="locales-action-button locales-delete-button"
                      title="Eliminar negocio"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje cuando no hay negocios */}
      {!loading && !renderError && negocios.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay negocios</h3>
          <p className="text-gray-500 mb-4">
            {error ?
              'Hubo un problema al cargar los negocios.' :
              searchTerm || filterStatus !== 'all' ?
                'No se encontraron negocios con los filtros aplicados.' :
                'Aún no hay negocios registrados.'
            }
          </p>
          {!error && apiService.isAuthenticated() && (
            <button
              onClick={() => loadNegocios()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Recargar negocios
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
                {' '}negocios
              </p>
            </div>

            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 0 || !apiService.isAuthenticated() || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
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
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
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
                  <span className="sr-only">Siguiente</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal para nuevo negocio */}
      {showModal && (
        <div className="locales-modal-overlay">
          <div className="locales-modal">
            <h2 className="locales-modal-title">Registrar Nuevo Local</h2>
            <form onSubmit={crearNegocio} className="locales-modal-form">
              <div className="locales-form-grid">
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    value={newNegocio.commercialName}
                    onChange={(e) => setNewNegocio({ ...newNegocio, commercialName: e.target.value })}
                    className="locales-form-input"
                    placeholder="Ingrese el nombre comercial"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Representante *
                  </label>
                  <input
                    type="text"
                    value={newNegocio.representativeName}
                    onChange={(e) => setNewNegocio({ ...newNegocio, representativeName: e.target.value })}
                    className="locales-form-input"
                    placeholder="Nombre del representante"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Cédula/RUC
                  </label>
                  <input
                    type="text"
                    value={newNegocio.cedulaOrRuc}
                    onChange={(e) => setNewNegocio({ ...newNegocio, cedulaOrRuc: e.target.value })}
                    className="locales-form-input"
                    placeholder="1234567890"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newNegocio.phone}
                    onChange={(e) => setNewNegocio({ ...newNegocio, phone: e.target.value })}
                    className="locales-form-input"
                    placeholder="0987654321"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newNegocio.email}
                    onChange={(e) => setNewNegocio({ ...newNegocio, email: e.target.value })}
                    className="locales-form-input"
                    placeholder="email@ejemplo.com"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Lugar de Venta
                  </label>
                  <select
                    value={newNegocio.salePlace}
                    onChange={(e) => setNewNegocio({ ...newNegocio, salePlace: e.target.value as any })}
                    className="locales-form-select"
                    disabled={!apiService.isAuthenticated() || loading}
                  >
                    <option value="LOCAL">Local</option>
                    <option value="FERIAS">Ferias</option>
                    <option value="DOMICILIO">Domicilio</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Servicio de Delivery
                  </label>
                  <select
                    value={newNegocio.deliveryService}
                    onChange={(e) => setNewNegocio({ ...newNegocio, deliveryService: e.target.value as any })}
                    className="locales-form-select"
                    disabled={!apiService.isAuthenticated() || loading}
                  >
                    <option value="BAJO_PEDIDO">Bajo pedido</option>
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="NO_DISPONIBLE">No disponible</option>
                  </select>
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Sector/Parroquia
                  </label>
                  <input
                    type="text"
                    value={newNegocio.parishCommunitySector}
                    onChange={(e) => setNewNegocio({ ...newNegocio, parishCommunitySector: e.target.value })}
                    className="locales-form-input"
                    placeholder="Sector o parroquia"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group locales-form-full-width">
                  <label className="locales-form-label">
                    Descripción
                  </label>
                  <textarea
                    value={newNegocio.description}
                    onChange={(e) => setNewNegocio({ ...newNegocio, description: e.target.value })}
                    className="locales-form-input"
                    rows={3}
                    placeholder="Descripción del negocio"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group locales-form-full-width">
                  <label className="locales-form-label">
                    Productos/Servicios
                  </label>
                  <textarea
                    value={newNegocio.productsServices}
                    onChange={(e) => setNewNegocio({ ...newNegocio, productsServices: e.target.value })}
                    className="locales-form-input"
                    rows={3}
                    placeholder="Productos y servicios que ofrece"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label flex items-center">
                    <input
                      type="checkbox"
                      checked={newNegocio.acceptsWhatsappOrders}
                      onChange={(e) => setNewNegocio({ ...newNegocio, acceptsWhatsappOrders: e.target.checked })}
                      className="mr-2"
                      disabled={!apiService.isAuthenticated() || loading}
                    />
                    Acepta pedidos por WhatsApp
                  </label>
                </div>
              </div>
              <div className="locales-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="locales-cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="locales-submit-button"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  {loading ? 'Registrando...' : 'Registrar Local'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver documentos */}
      {showDocumentsModal && selectedNegocio && (
        <div className="locales-modal-overlay">
          <div className="locales-modal max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="locales-modal-title">
                Documentos de {selectedNegocio.commercialName}
              </h2>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedNegocio(null);
                  setCurrentDocuments({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Resumen del negocio (encima de los documentos) */}
{!loadingDocuments && (
  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
    <div className="flex items-start gap-4">
      <div className="locales-card-icon">
        <Store />
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold">
            {selectedNegocio.commercialName || 'Sin nombre comercial'}
          </h3>

          <span
            className={`locales-card-badge ${getCategoryColor(selectedNegocio.category?.name)}`}
            title="Categoría"
          >
            {selectedNegocio.category?.name || 'Sin categoría'}
          </span>

          <span
            className={`locales-card-badge ${getStatusColor(selectedNegocio.validationStatus)}`}
            title="Estado"
          >
            {formatEstadoText(selectedNegocio.validationStatus)}
          </span>
        </div>

        <p className="text-sm text-gray-600">
          RUC/Cédula: {selectedNegocio.cedulaOrRuc || 'No especificado'}
        </p>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Representante</p>
              <p className="font-medium text-gray-900">
                {selectedNegocio.representativeName || 'No especificado'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Sector/Parroquia</p>
              <p className="font-medium text-gray-900">
                {selectedNegocio.parishCommunitySector || 'No especificado'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Teléfono</p>
              <p className="font-medium text-gray-900">
                {selectedNegocio.phone || 'No especificado'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">
                {selectedNegocio.email || 'No especificado'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Lugar de venta</p>
              <p className="font-medium text-gray-900">
                {formatSalePlace(selectedNegocio.salePlace)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Delivery</p>
              <p className="font-medium text-gray-900">
                {formatDeliveryService(selectedNegocio.deliveryService)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}


            {loadingDocuments ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando documentos...</span>
              </div>
            ) : documentError ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{documentError}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cédula */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Cédula/RUC
                  </h3>
                  {currentDocuments.cedula ? (
                    <div className="space-y-3">
                      <img
                        src={currentDocuments.cedula}
                        alt="Cédula/RUC"
                        className="w-full h-40 object-cover rounded border"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          const nextElement = target.nextElementSibling as HTMLElement;
                          target.style.display = 'none';
                          if (nextElement) nextElement.style.display = 'block';
                        }}
                      />
                      <div style={{ display: 'none' }} className="text-center py-8 text-gray-500">
                        Error al cargar imagen
                      </div>
                      <a
                        href={currentDocuments.cedula}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No disponible</p>
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Logo
                  </h3>
                  {currentDocuments.logo ? (
                    <div className="space-y-3">
                      <img
                        src={currentDocuments.logo}
                        alt="Logo del negocio"
                        className="w-full h-40 object-cover rounded border"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          const nextElement = target.nextElementSibling as HTMLElement;
                          target.style.display = 'none';
                          if (nextElement) nextElement.style.display = 'block';
                        }}
                      />
                      <div style={{ display: 'none' }} className="text-center py-8 text-gray-500">
                        Error al cargar imagen
                      </div>
                      <a
                        href={currentDocuments.logo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No disponible</p>
                    </div>
                  )}
                </div>

                {/* Firma */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Edit className="w-5 h-5 mr-2" />
                    Firma
                  </h3>
                  {currentDocuments.signature ? (
                    <div className="space-y-3">
                      <img
                        src={currentDocuments.signature}
                        alt="Firma"
                        className="w-full h-40 object-cover rounded border"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          const nextElement = target.nextElementSibling as HTMLElement;
                          target.style.display = 'none';
                          if (nextElement) nextElement.style.display = 'block';
                        }}
                      />
                      <div style={{ display: 'none' }} className="text-center py-8 text-gray-500">
                        Error al cargar imagen
                      </div>
                      <a
                        href={currentDocuments.signature}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Edit className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No disponible</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones del modal de documentos */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="flex gap-2">
                <button
                  onClick={() => aprobarNegocio(selectedNegocio.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  <Check className="w-4 h-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => {
                    setShowDocumentsModal(false);
                    iniciarRechazo(selectedNegocio);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  <X className="w-4 h-4" />
                  Rechazar
                </button>
              </div>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedNegocio(null);
                  setCurrentDocuments({});
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para observación de rechazo */}
      {showObservationModal && selectedNegocio && (
        <div className="locales-modal-overlay">
          <div className="locales-modal max-w-md">
            <h2 className="locales-modal-title">
              Rechazar Negocio
            </h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Está a punto de rechazar el negocio: <strong>{selectedNegocio.commercialName}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Por favor, proporcione una observación detallada sobre el motivo del rechazo:
              </p>
              <textarea
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
                placeholder="Escriba aquí la observación para el rechazo del negocio..."
                disabled={loading}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowObservationModal(false);
                  setObservationText('');
                  setSelectedNegocio(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={enviarRechazo}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={loading || !observationText.trim()}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Rechazo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalles */}
      {showViewModal && selectedNegocio && (
        <div className="locales-modal-overlay">
          <div className="locales-modal max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="locales-modal-title">
                Detalles de {selectedNegocio.commercialName}
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedNegocio(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre Comercial</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.commercialName || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Representante</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.representativeName || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cédula/RUC</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.cedulaOrRuc || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.phone || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.email || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sector/Parroquia</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.parishCommunitySector || 'No especificado'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Categoría</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.category?.name || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedNegocio.validationStatus)}`}>
                    {formatEstadoText(selectedNegocio.validationStatus)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lugar de Venta</label>
                  <p className="mt-1 text-sm text-gray-900">{formatSalePlace(selectedNegocio.salePlace)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Servicio de Delivery</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDeliveryService(selectedNegocio.deliveryService)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acepta WhatsApp</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNegocio.acceptsWhatsappOrders ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedNegocio.registrationDate ?
                      new Date(selectedNegocio.registrationDate).toLocaleDateString('es-ES') :
                      'No especificado'
                    }
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                {selectedNegocio.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNegocio.description}</p>
                  </div>
                )}
                {selectedNegocio.productsServices && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Productos/Servicios</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNegocio.productsServices}</p>
                  </div>
                )}

                {/* Redes sociales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Redes Sociales</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedNegocio.facebook && (
                      <a
                        href={selectedNegocio.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                      >
                        Facebook
                      </a>
                    )}
                    {selectedNegocio.instagram && (
                      <a
                        href={selectedNegocio.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs"
                      >
                        Instagram
                      </a>
                    )}
                    {selectedNegocio.tiktok && (
                      <a
                        href={selectedNegocio.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs"
                      >
                        TikTok
                      </a>
                    )}
                    {selectedNegocio.website && (
                      <a
                        href={selectedNegocio.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                      >
                        Sitio Web
                      </a>
                    )}
                    {!selectedNegocio.facebook && !selectedNegocio.instagram && !selectedNegocio.tiktok && !selectedNegocio.website && (
                      <span className="text-gray-500 text-xs">No especificado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedNegocio(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar negocio */}
      {showEditModal && selectedNegocio && (
        <div className="locales-modal-overlay">
          <div className="locales-modal max-w-4xl">
            <h2 className="locales-modal-title">Editar Local: {selectedNegocio.commercialName}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();

              if (!newNegocio.commercialName.trim() || !newNegocio.representativeName.trim()) {
                alert('Nombre comercial y representante son requeridos');
                return;
              }

              try {
                if (!verificarToken()) return;

                setLoading(true);
                const negocioData = {
                  commercialName: newNegocio.commercialName.trim(),
                  representativeName: newNegocio.representativeName.trim(),
                  cedulaOrRuc: newNegocio.cedulaOrRuc.trim(),
                  phone: newNegocio.phone.trim(),
                  email: newNegocio.email.trim(),
                  parishCommunitySector: newNegocio.parishCommunitySector.trim(),
                  facebook: newNegocio.facebook.trim(),
                  instagram: newNegocio.instagram.trim(),
                  tiktok: newNegocio.tiktok.trim(),
                  website: newNegocio.website.trim(),
                  description: newNegocio.description.trim(),
                  productsServices: newNegocio.productsServices.trim(),
                  acceptsWhatsappOrders: newNegocio.acceptsWhatsappOrders,
                  deliveryService: newNegocio.deliveryService,
                  salePlace: newNegocio.salePlace,
                  categoryId: newNegocio.categoryId
                };

                console.log('✏️ Editando negocio:', negocioData);

                const response = await apiService.request<BusinessAPI>(`/business/${selectedNegocio.id}`, {
                  method: 'PUT',
                  body: JSON.stringify(negocioData)
                });

                console.log('📡 Respuesta de edición:', response);

                if (response.success) {
                  console.log('🎉 Negocio editado exitosamente');
                  setShowEditModal(false);
                  setSelectedNegocio(null);
                  await loadNegocios();
                  alert('Negocio editado exitosamente');
                } else {
                  console.error('❌ Error al editar:', response.error);
                  if (response.status === 401) {
                    setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
                    apiService.clearToken();
                  } else {
                    alert(response.error || 'Error al editar negocio');
                  }
                }
              } catch (err) {
                console.error('💥 Error de conexión al editar negocio:', err);
                alert('Error de conexión al editar negocio');
              } finally {
                setLoading(false);
              }
            }} className="locales-modal-form">
              <div className="locales-form-grid">
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    value={newNegocio.commercialName}
                    onChange={(e) => setNewNegocio({ ...newNegocio, commercialName: e.target.value })}
                    className="locales-form-input"
                    placeholder="Ingrese el nombre comercial"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Representante *
                  </label>
                  <input
                    type="text"
                    value={newNegocio.representativeName}
                    onChange={(e) => setNewNegocio({ ...newNegocio, representativeName: e.target.value })}
                    className="locales-form-input"
                    placeholder="Nombre del representante"
                    required
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Cédula/RUC
                  </label>
                  <input
                    type="text"
                    value={newNegocio.cedulaOrRuc}
                    onChange={(e) => setNewNegocio({ ...newNegocio, cedulaOrRuc: e.target.value })}
                    className="locales-form-input"
                    placeholder="1234567890"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newNegocio.phone}
                    onChange={(e) => setNewNegocio({ ...newNegocio, phone: e.target.value })}
                    className="locales-form-input"
                    placeholder="0987654321"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newNegocio.email}
                    onChange={(e) => setNewNegocio({ ...newNegocio, email: e.target.value })}
                    className="locales-form-input"
                    placeholder="email@ejemplo.com"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Lugar de Venta
                  </label>
                  <select
                    value={newNegocio.salePlace}
                    onChange={(e) => setNewNegocio({ ...newNegocio, salePlace: e.target.value as any })}
                    className="locales-form-select"
                    disabled={!apiService.isAuthenticated() || loading}
                  >
                    <option value="LOCAL">Local</option>
                    <option value="FERIAS">Ferias</option>
                    <option value="DOMICILIO">Domicilio</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Servicio de Delivery
                  </label>
                  <select
                    value={newNegocio.deliveryService}
                    onChange={(e) => setNewNegocio({ ...newNegocio, deliveryService: e.target.value as any })}
                    className="locales-form-select"
                    disabled={!apiService.isAuthenticated() || loading}
                  >
                    <option value="BAJO_PEDIDO">Bajo pedido</option>
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="NO_DISPONIBLE">No disponible</option>
                  </select>
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label">
                    Sector/Parroquia
                  </label>
                  <input
                    type="text"
                    value={newNegocio.parishCommunitySector}
                    onChange={(e) => setNewNegocio({ ...newNegocio, parishCommunitySector: e.target.value })}
                    className="locales-form-input"
                    placeholder="Sector o parroquia"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group locales-form-full-width">
                  <label className="locales-form-label">
                    Descripción
                  </label>
                  <textarea
                    value={newNegocio.description}
                    onChange={(e) => setNewNegocio({ ...newNegocio, description: e.target.value })}
                    className="locales-form-input"
                    rows={3}
                    placeholder="Descripción del negocio"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group locales-form-full-width">
                  <label className="locales-form-label">
                    Productos/Servicios
                  </label>
                  <textarea
                    value={newNegocio.productsServices}
                    onChange={(e) => setNewNegocio({ ...newNegocio, productsServices: e.target.value })}
                    className="locales-form-input"
                    rows={3}
                    placeholder="Productos y servicios que ofrece"
                    disabled={!apiService.isAuthenticated() || loading}
                  />
                </div>
                <div className="locales-form-group">
                  <label className="locales-form-label flex items-center">
                    <input
                      type="checkbox"
                      checked={newNegocio.acceptsWhatsappOrders}
                      onChange={(e) => setNewNegocio({ ...newNegocio, acceptsWhatsappOrders: e.target.checked })}
                      className="mr-2"
                      disabled={!apiService.isAuthenticated() || loading}
                    />
                    Acepta pedidos por WhatsApp
                  </label>
                </div>
              </div>
              <div className="locales-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedNegocio(null);
                  }}
                  className="locales-cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="locales-submit-button"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalesComerciales;