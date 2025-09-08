import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Filter, MapPin, Phone, Mail, Eye, Edit, Trash2, Building, User, Calendar, FileText, Download, MessageSquare, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

// Estados para modal de documentos/fotos
const [showPhotosModal, setShowPhotosModal] = useState(false);
const [currentPhotos, setCurrentPhotos] = useState<any[]>([]);
const [loadingPhotos, setLoadingPhotos] = useState(false);
const [photosError, setPhotosError] = useState<string>('');

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Función wrapper para setCurrentPage que valida valores negativos
  const setCurrentPageSafe = (page: number) => {
    const validPage = Math.max(0, page);
    if (page !== validPage) {
      console.warn(`⚠️ Página corregida de ${page} a ${validPage}`);
    }
    setCurrentPage(validPage);
  };
 // Función para obtener detalles completos del negocio (incluyendo fotos)
const obtenerDetallesCompletos = async (businessId: number): Promise<{ photos: any[] }> => {
  try {
    console.log('🔍 Obteniendo detalles completos del negocio:', businessId);
    
    if (!verificarToken()) {
      throw new Error('Token no válido');
    }

    // Buscar el negocio en la lista actual para obtener URLs
    const negocio = negocios.find(n => n.id === businessId);
    if (!negocio) {
      console.warn('⚠️ Negocio no encontrado en la lista actual');
      return { photos: [] };
    }

    // Usar el método del ApiService para obtener documentos desde URLs
    try {
      const documents = await apiService.getBusinessDocumentsFromUrls(negocio);
      const photos = [];

      // Convertir documentos a formato de fotos para compatibilidad
      if (documents.cedula) {
        photos.push({
          id: `cedula_${businessId}`,
          url: `data:image/jpeg;base64,${documents.cedula}`,
          photoType: 'DOCUMENT',
          fileType: 'cedula'
        });
      }

      if (documents.logo) {
        photos.push({
          id: `logo_${businessId}`,
          url: `data:image/jpeg;base64,${documents.logo}`,
          photoType: 'LOGO',
          fileType: 'logo'
        });
      }

      if (documents.signature) {
        photos.push({
          id: `signature_${businessId}`,
          url: `data:image/jpeg;base64,${documents.signature}`,
          photoType: 'SIGNATURE',
          fileType: 'signature'
        });
      }

      console.log('📸 Documentos convertidos a fotos:', photos.length);
      return { photos };

    } catch (apiError) {
      console.warn('⚠️ Error con API, usando URLs directas:', apiError);
      
      // Fallback: usar URLs directas desde el negocio
      const photos = [];
      
      if (negocio.cedulaFileUrl) {
        photos.push({
          id: `cedula_${businessId}`,
          url: corregirURL(negocio.cedulaFileUrl),
          photoType: 'DOCUMENT',
          fileType: 'cedula'
        });
      }
      
      if (negocio.logoUrl) {
        photos.push({
          id: `logo_${businessId}`,
          url: corregirURL(negocio.logoUrl),
          photoType: 'LOGO',
          fileType: 'logo'
        });
      }
      
      if (negocio.signatureUrl) {
        photos.push({
          id: `signature_${businessId}`,
          url: corregirURL(negocio.signatureUrl),
          photoType: 'SIGNATURE',
          fileType: 'signature'
        });
      }
      
      return { photos };
    }
    
  } catch (error) {
    console.error('💥 Error obteniendo detalles completos:', error);
    return { photos: [] };
  }
};

// Función para descargar imagen
const descargarImagen = async (url: string, filename: string) => {
  try {
    console.log('💾 Iniciando descarga de imagen:', { url, filename });
    
    // Corregir la URL si es necesario
    const urlCorregida = corregirURL(url);
    
    // Crear un elemento anchor temporal para la descarga
    const link = document.createElement('a');
    link.href = urlCorregida;
    link.download = filename;
    link.target = '_blank';
    
    // Agregar al DOM temporalmente y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Descarga iniciada exitosamente');
    
    // Alternativa: usar fetch para descargar y crear blob
    /*
    try {
      const response = await fetch(urlCorregida);
      if (!response.ok) throw new Error('Error en la descarga');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar el blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      console.log('✅ Descarga completada exitosamente');
    } catch (fetchError) {
      console.warn('⚠️ Error con fetch, usando método directo:', fetchError);
      // Fallback al método directo
      window.open(urlCorregida, '_blank');
    }
    */
    
  } catch (error) {
    console.error('💥 Error descargando imagen:', error);
    
    // Fallback: abrir en nueva pestaña
    try {
      window.open(url, '_blank');
      console.log('🔄 Fallback: abriendo imagen en nueva pestaña');
    } catch (fallbackError) {
      console.error('💥 Error en fallback:', fallbackError);
      alert('No se pudo descargar la imagen. Intente hacer clic derecho y "Guardar imagen como..."');
    }
  }
};

// Función para cargar fotos del negocio
const cargarFotos = async (businessId: number) => {
  try {
    setLoadingPhotos(true);
    setPhotosError('');
    
    const detalles = await obtenerDetallesCompletos(businessId);
    
    if (detalles && detalles.photos) {
      setCurrentPhotos(detalles.photos);
      console.log('📸 Fotos cargadas:', detalles.photos.length);
    } else {
      setCurrentPhotos([]);
      setPhotosError('No se encontraron fotos para este negocio.');
    }
  } catch (err) {
    console.error('💥 Error cargando fotos:', err);
    setPhotosError('Error al cargar las fotos del negocio.');
    setCurrentPhotos([]);
  } finally {
    setLoadingPhotos(false);
  }
};

// Función para abrir modal de fotos
const abrirModalFotos = async (negocio: BusinessAPI) => {
  setSelectedNegocio(negocio);
  setShowPhotosModal(true);
  await cargarFotos(negocio.id);
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
      let localesDelUsuario = negocios.filter(n => n.user.id === negocio.user.id);
      console.log('🏪 Locales encontrados del usuario:', localesDelUsuario.length);
      
      // Si hay un filtro activo, aplicarlo también a los locales del usuario
      if (filterStatus !== 'all') {
        const statusMap: { [key: string]: string } = {
          'activo': 'APPROVED',
          'pendiente': 'PENDING',
          'inactivo': 'REJECTED'
        };
        
        if (filterStatus === 'activo') {
          // Para "Aprobado" incluir tanto APPROVED como VALIDATED
          localesDelUsuario = localesDelUsuario.filter(negocio => 
            validarEstadoNegocio(negocio.validationStatus) === 'APPROVED'
          );
        } else {
          const apiStatus = statusMap[filterStatus] || filterStatus;
          localesDelUsuario = localesDelUsuario.filter(negocio => 
            validarEstadoNegocio(negocio.validationStatus) === validarEstadoNegocio(apiStatus)
          );
        }
        
        console.log(`🔍 Aplicando filtro "${filterStatus}" a locales del usuario. Locales filtrados:`, localesDelUsuario.length);
      }
      
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
        <div>
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
  </div>
);                     
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
                      
                      {/* Botones de acción para cada local */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedNegocio(negocio);
                            setShowViewModal(true);
                            setShowDocumentsModal(false);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
                          title="Ver detalles completos del local"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver</span>
                        </button>
                        

                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron locales para este usuario</p>
                </div>
              )}
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
      )}

 {/* aqui */}

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
                
                {/* Redes sociales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Redes Sociales</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedNegocio.facebook && (
                      <a
                        href={selectedNegocio.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200 transition-colors"
                      >
                        Facebook
                      </a>
                    )}
                    {selectedNegocio.instagram && (
                      <a
                        href={selectedNegocio.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs hover:bg-pink-200 transition-colors"
                      >
                        Instagram
                      </a>
                    )}
                    {selectedNegocio.tiktok && (
                      <a
                        href={selectedNegocio.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-200 transition-colors"
                      >
                        TikTok
                      </a>
                    )}
                    {selectedNegocio.website && (
                      <a
                        href={selectedNegocio.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs hover:bg-green-200 transition-colors"
                      >
                        Sitio Web
                      </a>
                    )}
                    {!selectedNegocio.facebook && !selectedNegocio.instagram && !selectedNegocio.tiktok && !selectedNegocio.website && (
                      <span className="text-gray-500 text-xs">No especificado</span>
                    )}
                  </div>
                </div>

                {/* Documentos */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">Documentos</label>
                    <button
                      onClick={() => abrirModalFotos(selectedNegocio)}
                      className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs hover:bg-purple-200 transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Ver Documentos
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Haga clic en "Ver Documentos" para acceder a las fotos y documentos del negocio
                  </p>
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

      {/* Modal para ver fotos/documentos */}
      {showPhotosModal && selectedNegocio && (
        <div className="locales-modal-overlay">
          <div className="locales-modal max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="locales-modal-title">
                Documentos de {selectedNegocio.commercialName}
              </h2>
              <button
                onClick={() => {
                  setShowPhotosModal(false);
                  setSelectedNegocio(null);
                  setCurrentPhotos([]);
                  setPhotosError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl font-bold">×</span>
              </button>
            </div>

            {loadingPhotos && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-gray-600">Cargando documentos...</span>
              </div>
            )}

            {photosError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <span className="text-lg mr-2">⚠️</span>
                <span>{photosError}</span>
              </div>
            )}

            {!loadingPhotos && !photosError && currentPhotos.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos disponibles</h3>
                <p className="text-gray-500">
                  Este negocio no tiene documentos o fotos cargadas en el sistema.
                </p>
              </div>
            )}

            {!loadingPhotos && currentPhotos.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Documentos Disponibles ({currentPhotos.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Haga clic en "Ver Imagen" para abrir en nueva pestaña o "Descargar" para guardar el archivo
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentPhotos.map((photo, index) => (
                    <div key={photo.id || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg mr-3">
                          <FileText className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {photo.photoType === 'SLIDE' ? 'Imagen del Negocio' : 
                             photo.fileType ? `${photo.fileType.toUpperCase()}` : 
                             `Documento ${index + 1}`}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {photo.fileType || 'Tipo de archivo desconocido'}
                          </p>
                        </div>
                      </div>

                      {photo.url && (
                        <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                          <img
                            src={photo.url}
                            alt={`Documento ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(photo.url, '_blank')}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="flex items-center justify-center h-full text-gray-400">
                                    <div class="text-center">
                                      <svg class="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                      </svg>
                                      <p class="text-xs">Vista previa no disponible</p>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(photo.url, '_blank')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Imagen
                        </button>
                        <button
                          onClick={() => descargarImagen(photo.url, `documento_${selectedNegocio.commercialName}_${index + 1}.${photo.fileType || 'jpg'}`)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowPhotosModal(false);
                  setSelectedNegocio(null);
                  setCurrentPhotos([]);
                  setPhotosError('');
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