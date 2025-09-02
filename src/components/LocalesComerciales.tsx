import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Filter, MapPin, Phone, Mail, Eye, Edit, Trash2, Building, User, Calendar, FileText, Download, MessageSquare, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ApiService } from './login/ApiService';
import '../styles/localesComerciales.css';
import { BusinessDetail, BusinessPhoto, BusinessImages } from './login/interfaces';
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
    case 'VALIDATED':
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

  // Estados para modal de imágenes
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [businessImages, setBusinessImages] = useState<BusinessImages | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Función wrapper para setCurrentPage que valida valores negativos
  const setCurrentPageSafe = (page: number) => {
    const validPage = Math.max(0, page);
    if (page !== validPage) {
      console.warn(`⚠️ Página corregida de ${page} a ${validPage}`);
    }
    setCurrentPage(validPage);
  };

  // Función para agrupar negocios por usuario
  const agruparNegociosPorUsuario = (negocios: BusinessAPI[]) => {
    const grupos = new Map<string, BusinessAPI[]>();
    
    negocios.forEach(negocio => {
      const userId = negocio.user.id.toString();
      if (!grupos.has(userId)) {
        grupos.set(userId, []);
      }
      grupos.get(userId)!.push(negocio);
    });
    
    return Array.from(grupos.entries()).map(([userId, negociosDelUsuario]) => ({
      userId,
      user: negociosDelUsuario[0].user,
      negocios: negociosDelUsuario
    }));
  };

  // Función para obtener usuarios paginados
  const obtenerUsuariosPaginados = (negocios: BusinessAPI[], page: number, size: number) => {
    const usuariosAgrupados = agruparNegociosPorUsuario(negocios);
    const startIndex = page * size;
    const endIndex = startIndex + size;
    return usuariosAgrupados.slice(startIndex, endIndex);
  };

  // Función para calcular el total de páginas basado en usuarios
  const calcularTotalPaginasUsuarios = (negocios: BusinessAPI[], size: number) => {
    const totalUsuarios = agruparNegociosPorUsuario(negocios).length;
    return Math.ceil(totalUsuarios / size);
  };

  // Función para corregir URLs incorrectas
  const corregirURL = (url: string): string => {
    if (!url || !url.startsWith('http')) return url;
    
    let urlCorregida = url;
    
    // Corregir IPs incorrectas
    if (url.includes('192.168.56.1') || url.includes('192.168.1.25')) {
      urlCorregida = urlCorregida.replace(/192\.168\.(56\.1|1\.25):\d+/, 'localhost:5173');
    }
    
    // Corregir puertos incorrectos
    if (url.includes(':5174') || url.includes(':3000') || url.includes(':8080')) {
      urlCorregida = urlCorregida.replace(/:\d+/, ':5173');
    }
    
    if (url !== urlCorregida) {
      console.log(`🔧 URL corregida: ${url} → ${urlCorregida}`);
    }
    
    return urlCorregida;
  };

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

  // Estados para documentos
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [currentDocuments, setCurrentDocuments] = useState<DocumentoNegocio>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string>('');
  
  // Estado para locales del usuario
  const [localesDelUsuario, setLocalesDelUsuario] = useState<BusinessAPI[]>([]);

  // Función para cargar imágenes del negocio
const loadBusinessImages = async (businessId: number) => {
  try {
    setImageLoading(true);
    console.log('🖼️ Cargando imágenes del negocio:', businessId);
   
    // Tipar la respuesta correctamente
    const response = await apiService.request<BusinessDetail>(`/admin/business/${businessId}`, {
      method: 'GET'
    });
   
    if (response.success && response.data) {
      const businessData = response.data;
      
      // Buscar el logo (foto con publicId o photoType específico)
      const logoPhoto = businessData.photos.find(photo => 
        photo.publicId || photo.photoType === 'LOGO'
      );
      
      // Filtrar las fotos SLIDE
      const slidePhotos = businessData.photos.filter(photo => 
        photo.photoType === 'SLIDE'
      );
      
      // ✅ Asignar las imágenes procesadas
      setBusinessImages({
        logo: logoPhoto?.url || null,
        photos: slidePhotos.map(photo => photo.url)
      });
      setCurrentImageIndex(0);
      
    } else {
      console.error('❌ Error cargando imágenes:', response.error);
      // ✅ Manejar error correctamente
      setBusinessImages({
        logo: null,
        photos: [],
        error: response.error || response.message || 'Error desconocido'
      });
    }
  } catch (error) {
    console.error('💥 Error de conexión cargando imágenes:', error);
    // ✅ Manejar error de conexión
    setBusinessImages({
      logo: null,
      photos: [],
      error: 'Error de conexión'
    });
  } finally {
    setImageLoading(false);
  }
};
  // Función unificada para verificar token
  const verificarToken = (): boolean => {
    console.log('🔍 Verificando estado de autenticación...');

    const token = apiService.getCurrentToken();
    const isAuth = apiService.isAuthenticated();

    console.log('🔑 Token actual:', token ? `${token.substring(0, 50)}...` : 'NO HAY TOKEN');
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
      console.log('🚀 Iniciando carga de documentos para negocio:', businessId);
      
      if (!verificarToken()) {
        console.log('❌ Token no válido, abortando carga de documentos');
        return;
      }

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
          if (negocio.cedulaFileUrl.startsWith('http')) {
            documents.cedula = corregirURL(negocio.cedulaFileUrl);
            console.log('✅ URL de cédula procesada:', documents.cedula);
          }
        } catch (err) {
          console.warn('⚠️ Error procesando cédula:', err);
        }
      }

      // Procesar logo si existe
      if (negocio.logoUrl) {
        try {
          if (negocio.logoUrl.startsWith('http')) {
            documents.logo = corregirURL(negocio.logoUrl);
            console.log('✅ URL de logo procesada:', documents.logo);
          }
        } catch (err) {
          console.warn('⚠️ Error procesando logo:', err);
        }
      }

      // Procesar firma si existe
      if (negocio.signatureUrl) {
        try {
          if (negocio.signatureUrl.startsWith('http')) {
            documents.signature = corregirURL(negocio.signatureUrl);
            console.log('✅ URL de firma procesada:', documents.signature);
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
      
      console.log('📋 Documentos cargados:', documents);
      console.log('✅ Carga de documentos completada');

    } catch (err) {
      console.error('💥 Error cargando documentos:', err);
      setDocumentError('Error al cargar los documentos del negocio.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Función para abrir ventana de locales del usuario
  const abrirDocumentos = async (negocio: BusinessAPI) => {
    console.log('👤 Abriendo locales del usuario:', negocio.user.name);
    try {
      // Buscar todos los negocios del mismo usuario
      const localesDelUsuario = negocios.filter(n => n.user.id === negocio.user.id);
      console.log('🏪 Locales encontrados del usuario:', localesDelUsuario.length);
      
      setLocalesDelUsuario(localesDelUsuario);
      setSelectedNegocio(negocio);
      setShowDocumentsModal(true);
      console.log('✅ Modal de locales del usuario abierto correctamente');
    } catch (error) {
      console.error('❌ Error al abrir locales del usuario:', error);
      alert('Error al abrir los locales del usuario');
    }
  };

  // Cargar negocios desde la API
  const loadNegocios = async (page: number = currentPage, size: number = pageSize) => {
    try {
      setLoading(true);
      setError('');

      // Validar que page no sea negativo
      const validPage = Math.max(0, page);
      if (page !== validPage) {
        console.warn(`⚠️ Página corregida de ${page} a ${validPage}`);
        setCurrentPageSafe(validPage);
      }

      console.log('🚀 Iniciando carga de negocios...');

      if (!verificarToken()) {
        setLoading(false);
        return;
      }

      console.log('📊 Parámetros de consulta:', { page: validPage, size, searchTerm });

      // Usar endpoint específico para listar negocios públicos
      const params = new URLSearchParams({
        page: validPage.toString(),
        size: size.toString(),
      });

      console.log('🔍 Usando endpoint de negocios públicos...');
      const response: any = await apiService.request<PaginatedBusinessResponse>(`/business/private-list-by-category?${params}`, {
        method: 'GET'
      });

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
        // Calcular paginación basada en usuarios, no en negocios
        const totalUsuarios = agruparNegociosPorUsuario(negociosLimpios).length;
        const totalPaginasUsuarios = Math.ceil(totalUsuarios / pageSize);
        setTotalPages(totalPaginasUsuarios);
        setTotalElements(totalUsuarios);
        // Resetear a la primera página cuando se cargan nuevos datos
        setCurrentPageSafe(0);

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
    const pendientes = negociosList.filter(n => validarEstadoNegocio(n.validationStatus) === 'PENDING').length;
    const aprobados = negociosList.filter(n => validarEstadoNegocio(n.validationStatus) === 'APPROVED').length;
    const rechazados = negociosList.filter(n => validarEstadoNegocio(n.validationStatus) === 'REJECTED').length;

    setStats({
      totalNegocios: total,
      pendientes,
      aprobados,
      rechazados
    });
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
      setCurrentPageSafe(newPage);
      loadNegocios(newPage, pageSize);
    }
  };

  // Cambiar tamaño de página
  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPageSafe(0);
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
      negociosFiltrados = negociosFiltrados.filter(negocio => {
        if (filterStatus === 'activo') {
          // Para "Aprobado" incluir tanto APPROVED como VALIDATED
          return validarEstadoNegocio(negocio.validationStatus) === 'APPROVED';
        }
        return validarEstadoNegocio(negocio.validationStatus) === validarEstadoNegocio(apiStatus);
      });
    }

    // Filtrar por búsqueda (ahora busca en información del usuario también)
    if (searchTerm.trim() !== '') {
      const terminoBusqueda = searchTerm.toLowerCase();
      negociosFiltrados = negociosFiltrados.filter(negocio =>
        // Búsqueda en información del negocio
        (negocio.commercialName && negocio.commercialName.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.representativeName && negocio.representativeName.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.email && negocio.email.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.cedulaOrRuc && negocio.cedulaOrRuc.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.phone && negocio.phone.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.parishCommunitySector && negocio.parishCommunitySector.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.category && negocio.category.name && negocio.category.name.toLowerCase().includes(terminoBusqueda)) ||
        // Búsqueda en información del usuario
        (negocio.user.name && negocio.user.name.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.user.email && negocio.user.email.toLowerCase().includes(terminoBusqueda)) ||
        (negocio.user.identification && negocio.user.identification.toLowerCase().includes(terminoBusqueda))
      );
    }

    setNegociosFiltrados(negociosFiltrados);
  }, [negocios, filterStatus, searchTerm]);

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    setCurrentPageSafe(0);
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
          <User className="w-8 h-8 text-red-600 mr-3" />
          Usuarios con Locales Comerciales
        </h1>
        <p className="locales-subtitle">
          Gestión de usuarios y sus locales comerciales asociados
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
              <p className="locales-stat-text-sm">Total Usuarios</p>
              <p className="locales-stat-text-lg">{agruparNegociosPorUsuario(negocios).length}</p>
            </div>
            <div className="locales-stat-icon-container bg-blue-100">
              <User className="locales-stat-icon text-blue-600" />
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
              placeholder="Buscar por nombre de usuario, email, cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPageSafe(0);
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
          Mostrando {obtenerUsuariosPaginados(negociosFiltrados, currentPage, pageSize).length} de {agruparNegociosPorUsuario(negociosFiltrados).length} usuarios
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

        {!loading && obtenerUsuariosPaginados(negociosFiltrados, currentPage, pageSize).map((grupoUsuario) => (
          <div key={grupoUsuario.userId} className="locales-card">
            <div className="locales-card-content">
              <div className="locales-card-main">
                <div className="locales-card-header">
                  <div className="locales-card-icon">
                    <User />
                  </div>
                  <div className="locales-card-info">
                    <div className="locales-card-title">
                      <h3 className="locales-card-name">{grupoUsuario.user.name || 'Usuario sin nombre'}</h3>
                      <span className="locales-card-badge bg-blue-100 text-blue-800">
                        {grupoUsuario.negocios.length} {grupoUsuario.negocios.length === 1 ? 'Local' : 'Locales'}
                      </span>
                      <span className="locales-card-badge bg-gray-100 text-gray-800">
                        Cédula: {grupoUsuario.user.identification || 'No especificado'}
                      </span>
                    </div>
                    <p className="locales-card-license">Email: {grupoUsuario.user.email || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* Botón para ver locales del usuario */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => abrirDocumentos(grupoUsuario.negocios[0])}
                  className="locales-action-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                  disabled={loading || !apiService.isAuthenticated()}
                  title="Ver locales del usuario"
                >
                  <Eye className="w-4 h-4" />
                  <span>Abrir</span>
                </button>
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
                {' '}usuarios
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

      {/* Modal para ver locales del usuario */}
      {showDocumentsModal && selectedNegocio && (
        <div className="locales-modal-overlay" onClick={() => console.log('🔍 Modal overlay clickeado')}>
          <div className="locales-modal max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {console.log('🎯 Renderizando modal de locales del usuario:', selectedNegocio?.user.name)}
            <div className="flex justify-between items-center mb-6">
              <h2 className="locales-modal-title">
                Locales de {selectedNegocio?.user.name || 'Usuario'}
              </h2>
              <button
                onClick={() => {
                  console.log('🔒 Cerrando modal de locales del usuario');
                  setShowDocumentsModal(false);
                  setSelectedNegocio(null);
                  setLocalesDelUsuario([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl font-bold">×</span>
              </button>
            </div>
            
            {/* Información básica del usuario */}
            <div className="mb-6 p-4 border rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold mb-2 text-blue-900">
                {selectedNegocio?.user.name || 'Usuario sin nombre'}
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                Cédula: {selectedNegocio?.user.identification || 'No especificado'}
              </p>
              <p className="text-sm text-blue-700">
                Email: {selectedNegocio?.user.email || 'No especificado'}
              </p>
              <p className="text-sm text-blue-700 font-medium">
                Total de locales: {localesDelUsuario.length}
              </p>
            </div>

            {/* Lista de locales del usuario */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800 border-b pb-2">
                Locales asociados:
              </h4>
              
              {localesDelUsuario.length > 0 ? (
                localesDelUsuario.map((negocio) => (
                  <div key={negocio.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900 mb-2 text-lg">
                          {negocio.commercialName || 'Sin nombre comercial'}
                        </h5>
                        <p className="text-gray-600 mb-3 leading-relaxed">
                          {negocio.description || 'Sin descripción disponible'}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(negocio.category?.name)}`}>
                            {negocio.category?.name || 'Sin categoría'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(negocio.validationStatus)}`}>
                            {formatEstadoText(negocio.validationStatus)}
                          </span>
                        </div>
                      </div>
                      
                  {/* Acciones del modal */}
            <div className="flex justify-end items-center mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedNegocio(null);
                  setLocalesDelUsuario([]);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )},

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
                <span className="text-2xl font-bold">×</span>
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
                
                {/* Redes sociales como campo separado - SIEMPRE visible CON DISEÑO MEJORADO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Redes Sociales</label>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {selectedNegocio.facebook && (
                      <a
                        href={selectedNegocio.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </a>
                    )}
                    {selectedNegocio.instagram && (
                      <a
                        href={selectedNegocio.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        Instagram
                      </a>
                    )}
                    {selectedNegocio.tiktok && (
                      <a
                        href={selectedNegocio.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.12 20.9a6.34 6.34 0 0 0 10.86-4.43V7.93a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.16-.36z"/>
                        </svg>
                        TikTok
                      </a>
                    )}
                    {selectedNegocio.website && (
                      <a
                        href={selectedNegocio.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Sitio Web
                      </a>
                    )}
                    {!selectedNegocio.facebook && !selectedNegocio.instagram && !selectedNegocio.tiktok && !selectedNegocio.website && (
                      <span className="text-gray-500 text-sm italic bg-gray-100 px-3 py-2 rounded-lg">No especificado</span>
                    )}
                  </div>
                </div>
                
                {selectedNegocio.productsServices && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Productos/Servicios</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNegocio.productsServices}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              {/* Botones de acción para locales pendientes */}
              {selectedNegocio.validationStatus === 'PENDING' && (
                <div className="flex gap-3">
                  {/* Botón Ver Imágenes */}
                  <button
                    onClick={() => {
                      setShowImagesModal(true);
                      loadBusinessImages(selectedNegocio.id);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    title="Ver imágenes del negocio"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <span>Ver Imágenes</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (!window.confirm('¿Está seguro que desea aprobar este local?')) {
                        return;
                      }
                      try {
                        if (!verificarToken()) return;
                        
                        setLoading(true);
                        console.log('✅ Aprobando local:', selectedNegocio.id);
                        
                        const response = await apiService.request<{ message: string }>(`/business/${selectedNegocio.id}/approve`, {
                          method: 'PUT'
                        });
                        
                        if (response.success) {
                          console.log('🎉 Local aprobado exitosamente');
                          alert('Local aprobado exitosamente');
                          // Recargar datos y cerrar modal
                          await loadNegocios();
                          setShowViewModal(false);
                          setSelectedNegocio(null);
                        } else {
                          console.error('❌ Error al aprobar:', response.error);
                          alert('Error al aprobar local: ' + response.error);
                        }
                      } catch (err) {
                        console.error('💥 Error de conexión al aprobar:', err);
                        alert('Error de conexión al aprobar local');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    title="Aprobar local"
                    disabled={loading}
                  >
                    <span className="text-lg">✓</span>
                    <span>Aprobar</span>
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!window.confirm('¿Está seguro que desea rechazar este local?')) {
                        return;
                      }
                      try {
                        if (!verificarToken()) return;
                        
                        setLoading(true);
                        console.log('❌ Rechazando local:', selectedNegocio.id);
                        
                        const response = await apiService.request<{ message: string }>(`/business/${selectedNegocio.id}/reject`, {
                          method: 'PUT'
                        });
                        
                        if (response.success) {
                          console.log('🎉 Local rechazado exitosamente');
                          alert('Local rechazado exitosamente');
                          // Recargar datos y cerrar modal
                          await loadNegocios();
                          setShowViewModal(false);
                          setSelectedNegocio(null);
                        } else {
                          console.error('❌ Error al rechazar:', response.error);
                          alert('Error al rechazar local: ' + response.error);
                        }
                      } catch (err) {
                        console.error('💥 Error de conexión al rechazar:', err);
                        alert('Error de conexión al rechazar local');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    title="Rechazar local"
                    disabled={loading}
                  >
                    <span className="text-lg">✗</span>
                    <span>Rechazar</span>
                  </button>
                </div>
              )}
              
              {/* Botón de cerrar */}
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

      {/* Modal para Ver Imágenes */}
      {showImagesModal && selectedNegocio && (
        <div className="locales-modal-overlay">
          <div className="locales-modal max-w-5xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="locales-modal-title">Imágenes del Negocio: {selectedNegocio.commercialName}</h2>
              <button
                onClick={() => {
                  setShowImagesModal(false);
                  setBusinessImages(null);
                  setCurrentImageIndex(0);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {imageLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando imágenes...</p>
                </div>
              </div>
            ) : businessImages?.error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-gray-600 text-lg">Error al cargar las imágenes</p>
                <p className="text-gray-500 text-sm mt-2">{businessImages.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Logo */}
                {businessImages?.logo && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Logo del Negocio</h3>
                          <p className="text-sm text-gray-600">Imagen oficial del establecimiento</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <img 
                          src={businessImages.logo} 
                          alt="Logo del negocio" 
                          className="max-w-full max-h-64 object-contain mx-auto rounded-lg shadow-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setCurrentImageIndex((prev: number) => prev > 0 ? prev - 1 : businessImages.photos.length - 1)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                          </svg>
                          Anterior
                        </button>
                        
                        {/* Indicadores de puntos */}
                        <div className="flex gap-2">
                          {businessImages.photos.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-3 h-3 rounded-full transition-colors ${
                                index === currentImageIndex 
                                  ? 'bg-blue-600' 
                                  : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setCurrentImageIndex((prev: number) => prev < businessImages.photos.length - 1 ? prev + 1 : 0)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          Siguiente
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Miniaturas */}
                    {businessImages.photos.length > 1 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {businessImages.photos.map((photo, index) => (
                            <button
                              key={photo.id}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                index === currentImageIndex 
                                  ? 'border-blue-500' 
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img 
                                src={photo.url} 
                                alt={`Miniatura ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje cuando no hay imágenes */}
                {(!businessImages?.logo && (!businessImages?.photos || businessImages.photos.length === 0)) && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                    <p className="text-gray-500 text-lg">No hay imágenes disponibles</p>
                    <p className="text-gray-400 text-sm mt-2">Este negocio no ha subido logo ni fotos</p>
                  </div>
                )}

                {/* Botón de regreso */}
                <div className="flex justify-center pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowImagesModal(false);
                      setBusinessImages(null);
                      setCurrentImageIndex(0);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                    </svg>
                    Regresar
                  </button>
                </div>
              </div>
            )}
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

                const response = await apiService.request(`/business/${selectedNegocio.id}`, {
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
                    onChange={(e) => setNewNegocio({ ...newNegocio, salePlace: e.target.value as 'FERIAS' | 'LOCAL' | 'DOMICILIO' | 'ONLINE' })}
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
                    onChange={(e) => setNewNegocio({ ...newNegocio, deliveryService: e.target.value as 'BAJO_PEDIDO' | 'DISPONIBLE' | 'NO_DISPONIBLE' })}
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

  useEffect(() => {
    loadNegocios();
  }, []);

  if (loading && negocios.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando locales comerciales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => loadNegocios()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="locales-comerciales-container">
      <div className="locales-header">
        <h1 className="locales-title">Locales Comerciales</h1>
        <p className="locales-subtitle">Gestión de locales comerciales registrados</p>
      </div>

      <div className="locales-grid">
        {negocios.map((negocio) => (
          <div key={negocio.id} className="locales-card">
            <div className="locales-card-header">
              <h3 className="locales-card-title">{negocio.commercialName}</h3>
              <span className={`locales-status-badge ${
                negocio.validationStatus === 'PENDING' ? 'locales-status-pending' :
                negocio.validationStatus === 'APPROVED' ? 'locales-status-approved' :
                'locales-status-rejected'
              }`}>
                {negocio.validationStatus === 'PENDING' ? 'Pendiente' :
                 negocio.validationStatus === 'APPROVED' ? 'Aprobado' :
                 'Rechazado'}
              </span>
            </div>

            <div className="locales-card-content">
              <p><strong>Representante:</strong> {negocio.user?.name || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> {negocio.phone || 'No especificado'}</p>
              <p><strong>Sector:</strong> {negocio.parishCommunitySector || 'No especificado'}</p>
            </div>

            <div className="locales-card-actions">
              <button
                onClick={() => {
                  setSelectedNegocio(negocio);
                  setShowViewModal(true);
                }}
                className="locales-view-button"
              >
                Ver Detalles
              </button>
              <button
                onClick={() => {
                  setSelectedNegocio(negocio);
                  setNewNegocio({
                    commercialName: negocio.commercialName || '',
                    representativeName: negocio.user?.name || '',
                    cedulaOrRuc: negocio.user?.identification || '',
                    phone: negocio.phone || '',
                    email: negocio.user?.email || '',
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
                className="locales-edit-button"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {negocios.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay locales comerciales registrados</p>
        </div>
      )}
    </div>
  );
};

export default LocalesComerciales; => window.open(businessImages.logo!, '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          Ver
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = businessImages.logo!;
                            link.download = `logo-${selectedNegocio.commercialName}.jpg`;
                            link.click();
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                          </svg>
                          Descargar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fotos del Carrusel */}
                {businessImages?.photos && businessImages.photos.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Galería de Fotos</h3>
                          <p className="text-sm text-gray-600">{businessImages.photos.length} imagen{businessImages.photos.length !== 1 ? 'es' : ''} disponible{businessImages.photos.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {businessImages.photos.length > 1 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{currentImageIndex + 1} de {businessImages.photos.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Imagen Principal */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 text-center">
                        <img 
                          src={businessImages.photos[currentImageIndex]?.url} 
                          alt={`Foto ${currentImageIndex + 1} del negocio`} 
                          className="max-w-full max-h-96 object-contain mx-auto rounded-lg shadow-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => window.open(businessImages.photos[currentImageIndex]?.url, '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          Ver
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = businessImages.photos[currentImageIndex]?.url;
                            link.download = `foto-${currentImageIndex + 1}-${selectedNegocio.commercialName}.jpg`;
                            link.click();
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                          </svg>
                          Descargar
                        </button>
                      </div>
                    </div>

                   {/* Controles de Navegación */}
                    {businessImages.photos.length > 1 && (
                      <div className="flex justify-center items-center gap-4">
                        <button
                          onClick={() => setCurrentImageIndex((prev: number) => prev > 0 ? prev - 1 : businessImages.photos.length - 1)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                          </svg>
                          Anterior
                        </button>
                        
                        {/* Indicadores de puntos */}
                        <div className="flex gap-2">
                          {businessImages.photos.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-3 h-3 rounded-full transition-colors ${
                                index === currentImageIndex 
                                  ? 'bg-blue-600' 
                                  : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setCurrentImageIndex((prev: number) => prev < businessImages.photos.length - 1 ? prev + 1 : 0)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 transition-colors"
                        >
                          Siguiente
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Miniaturas */}
                    {businessImages.photos.length > 1 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {businessImages.photos.map((photo, index) => (
                            <button
                              key={photo.id}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                index === currentImageIndex 
                                  ? 'border-blue-500' 
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img 
                                src={photo.url} 
                                alt={`Miniatura ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje cuando no hay imágenes */}
                {(!businessImages?.logo && (!businessImages?.photos || businessImages.photos.length === 0)) && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                    <p className="text-gray-500 text-lg">No hay imágenes disponibles</p>
                    <p className="text-gray-400 text-sm mt-2">Este negocio no ha subido logo ni fotos</p>
                  </div>
                )}

                {/* Botón de regreso */}
                <div className="flex justify-center pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowImagesModal(false);
                      setBusinessImages(null);
                      setCurrentImageIndex(0);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                    </svg>
                    Regresar
                  </button>
                </div>
              </div>
            )}
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

                const response = await apiService.request(`/business/${selectedNegocio.id}`, {
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
                    onChange={(e) => setNewNegocio({ ...newNegocio, salePlace: e.target.value as 'FERIAS' | 'LOCAL' | 'DOMICILIO' | 'ONLINE' })}
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
                    onChange={(e) => setNewNegocio({ ...newNegocio, deliveryService: e.target.value as 'BAJO_PEDIDO' | 'DISPONIBLE' | 'NO_DISPONIBLE' })}
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

  useEffect(() => {
    loadNegocios();
  }, []);

  if (loading && negocios.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando locales comerciales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => loadNegocios()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="locales-comerciales-container">
      <div className="locales-header">
        <h1 className="locales-title">Locales Comerciales</h1>
        <p className="locales-subtitle">Gestión de locales comerciales registrados</p>
      </div>

      <div className="locales-grid">
        {negocios.map((negocio) => (
          <div key={negocio.id} className="locales-card">
            <div className="locales-card-header">
              <h3 className="locales-card-title">{negocio.commercialName}</h3>
              <span className={`locales-status-badge ${
                negocio.validationStatus === 'PENDING' ? 'locales-status-pending' :
                negocio.validationStatus === 'APPROVED' ? 'locales-status-approved' :
                'locales-status-rejected'
              }`}>
                {negocio.validationStatus === 'PENDING' ? 'Pendiente' :
                 negocio.validationStatus === 'APPROVED' ? 'Aprobado' :
                 'Rechazado'}
              </span>
            </div>

            <div className="locales-card-content">
              <p><strong>Representante:</strong> {negocio.user?.name || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> {negocio.phone || 'No especificado'}</p>
              <p><strong>Sector:</strong> {negocio.parishCommunitySector || 'No especificado'}</p>
            </div>

            <div className="locales-card-actions">
              <button
                onClick={() => {
                  setSelectedNegocio(negocio);
                  setShowViewModal(true);
                }}
                className="locales-view-button"
              >
                Ver Detalles
              </button>
              <button
                onClick={() => {
                  setSelectedNegocio(negocio);
                  setNewNegocio({
                    commercialName: negocio.commercialName || '',
                    representativeName: negocio.user?.name || '',
                    cedulaOrRuc: negocio.user?.identification || '',
                    phone: negocio.phone || '',
                    email: negocio.user?.email || '',
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
                className="locales-edit-button"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {negocios.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay locales comerciales registrados</p>
        </div>
      )}
    </div>
    
  );
};

export default LocalesComerciales;