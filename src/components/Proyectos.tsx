import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Plus, Search, Filter, Calendar, User, TrendingUp, Eye, Edit, Trash2, Check, X, ChevronLeft, ChevronRight, FileText, Download, MessageSquare, Send, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { ApiService } from './login/ApiService'; 
import '../styles/proyectos.css';

// Usar la misma instancia global del servicio
const apiService = new ApiService();

// Interfaces actualizadas basadas en la API
interface ProyectoAPI {
  id: string;
  nombre: string;
  descripcion: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'en-progreso' | 'completado';
  fechaEnvio?: string;
  responsable?: string;
  presupuesto?: number;
  categoria?: string;
  fechaInicio?: string;
  fechaFin?: string;
  email?: string;
  cedula?: string;
  telefono?: string;
  address?: string;
}

interface ProyectoStats {
  totalProyectos: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

// Nueva interfaz para documentos
interface DocumentoProyecto {
  certificate?: string;
  identityDocument?: string;
  signedDocument?: string;
}

// Función para validar y normalizar estados
const validarEstado = (estado: string | undefined): 'pendiente' | 'aprobado' | 'rechazado' | 'en-progreso' | 'completado' => {
  if (!estado) return 'pendiente';
  
  const estadoLower = estado.toLowerCase();
  
  switch (estadoLower) {
    case 'pending':
    case 'pendiente':
      return 'pendiente';
    case 'approved':
    case 'aprobado':
      return 'aprobado';
    case 'rejected':
    case 'rechazado':
      return 'rechazado';
    case 'in-progress':
    case 'en-progreso':
    case 'progress':
    case 'progreso':
      return 'en-progreso';
    case 'completed':
    case 'completado':
    case 'finished':
    case 'terminado':
      return 'completado';
    default: {
      const estadosValidos = ['pendiente', 'aprobado', 'rechazado', 'en-progreso', 'completado'] as const;
      if ((estadosValidos as readonly string[]).includes(estado)) {
        return estado as 'pendiente' | 'aprobado' | 'rechazado' | 'en-progreso' | 'completado';
      }
      return 'pendiente';
    }
  }
};

const Proyectos: React.FC = () => {
  // Estados para datos
  const [proyectos, setProyectos] = useState<ProyectoAPI[]>([]);
  const [proyectosFiltrados, setProyectosFiltrados] = useState<ProyectoAPI[]>([]);
  const [stats, setStats] = useState<ProyectoStats>({
    totalProyectos: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0
  });
  
  // *** COMPONENTE DOCUMENTVIEWER COMPLETO ***
  const DocumentViewer = ({ 
    isOpen, 
    onClose, 
    documentData, 
    documentName, 
    documentType 
  }: {
    isOpen: boolean;
    onClose: () => void;
    documentData?: string;
    documentName?: string;
    documentType?: string;
  }) => {
    const [zoom, setZoom] = useState<number>(100);
    const [rotation, setRotation] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);

    // Reset estados cuando se abre/cierra el modal
    useEffect(() => {
      if (isOpen) {
        setZoom(100);
        setRotation(0);
        setLoading(true);
        setError('');
        setImageLoaded(false);
        
        const timer = setTimeout(() => {
          setLoading(false);
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    if (!documentData || !documentName) {
      return (
        <div className="document-viewer-overlay">
          <div className="document-viewer-container">
            <div className="document-viewer-error">
              <FileText className="document-viewer-error-icon" />
              <h3>Error al cargar documento</h3>
              <p>No se pudieron cargar los datos del documento</p>
              <button onClick={onClose} className="document-viewer-cancel-btn">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Función para detectar tipo de archivo
    const getFileTypeAndMime = (): { fileType: string; mimeType: string } => {
      const fileName = documentName.toLowerCase();
      
      if (documentData) {
        if (documentData.startsWith('JVBERi') || documentData.startsWith('JVBER')) {
          return { fileType: 'pdf', mimeType: 'application/pdf' };
        }
        if (documentData.startsWith('/9j/')) {
          return { fileType: 'image', mimeType: 'image/jpeg' };
        }
        if (documentData.startsWith('iVBOR')) {
          return { fileType: 'image', mimeType: 'image/png' };
        }
      }
      
      if (fileName.includes('.pdf')) {
        return { fileType: 'pdf', mimeType: 'application/pdf' };
      }
      if (fileName.includes('.jpg') || fileName.includes('.jpeg')) {
        return { fileType: 'image', mimeType: 'image/jpeg' };
      }
      if (fileName.includes('.png')) {
        return { fileType: 'image', mimeType: 'image/png' };
      }
      
      return { fileType: 'pdf', mimeType: 'application/pdf' };
    };
    
    const { fileType, mimeType } = getFileTypeAndMime();
    
    const cleanBase64Data = (data: string): string => {
      if (!data) return '';
      let cleanData = data.replace(/^data:[^;]+;base64,/, '');
      cleanData = cleanData.replace(/\s/g, '');
      return cleanData;
    };

    const cleanedData = cleanBase64Data(documentData);
    const dataUrl = `data:${mimeType};base64,${cleanedData}`;

    const handleDownload = (): void => {
      try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = documentName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        alert('Error al descargar el documento');
      }
    };

    const handleZoomIn = (): void => setZoom(prev => Math.min(200, prev + 25));
    const handleZoomOut = (): void => setZoom(prev => Math.max(25, prev - 25));
    const handleRotate = (): void => setRotation(prev => (prev + 90) % 360);

    return (
      <div className="document-viewer-overlay">
        <div className="document-viewer-container">
          {/* Header */}
          <div className="document-viewer-header">
            <div className="document-viewer-title">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h3 title={documentName}>{documentName}</h3>
            </div>
            
            <div className="document-viewer-controls">
              {fileType === 'image' && !loading && imageLoaded && (
                <>
                  <button onClick={handleZoomOut} className="document-viewer-control-btn" disabled={zoom <= 25}>
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="document-viewer-zoom-text">{zoom}%</span>
                  <button onClick={handleZoomIn} className="document-viewer-control-btn" disabled={zoom >= 200}>
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={handleRotate} className="document-viewer-control-btn">
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={onClose} className="document-viewer-close-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="document-viewer-content">
            <div className="document-viewer-content-inner">
              {loading ? (
                <div className="document-viewer-loading">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span>Cargando documento...</span>
                </div>
              ) : error ? (
                <div className="document-viewer-error">
                  <FileText className="document-viewer-error-icon" />
                  <h3>Error al cargar</h3>
                  <p>{error}</p>
                </div>
              ) : fileType === 'pdf' ? (
                <iframe
                  src={dataUrl}
                  className="document-viewer-iframe"
                  title={documentName}
                  onError={() => setError('Error al cargar el archivo PDF')}
                />
              ) : (
                <div className="document-viewer-image-container">
                  {!imageLoaded && !error && (
                    <div className="document-viewer-loading">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      <span>Cargando imagen...</span>
                    </div>
                  )}
                  <img
                    src={dataUrl}
                    alt={documentName}
                    className="document-viewer-image"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease',
                      display: imageLoaded ? 'block' : 'none'
                    }}
                    onLoad={() => {
                      setImageLoaded(true);
                      setError('');
                    }}
                    onError={() => {
                      setError('Error al cargar la imagen');
                      setImageLoaded(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="document-viewer-footer">
            <div className="document-viewer-info">
              {fileType === 'pdf' ? 'Documento PDF' : 'Imagen'} • {documentName}
            </div>
            <div className="document-viewer-actions">
              <button onClick={handleDownload} className="document-viewer-download-btn" disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </button>
              <button onClick={onClose} className="document-viewer-cancel-btn">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
  
  // Estados para nuevo proyecto
  const [newProyecto, setNewProyecto] = useState({
    nombre: '',
    descripcion: '',
    responsable: '',
    presupuesto: '',
    categoria: '',
    email: '',
    cedula: '',
    telefono: '',
    address: ''
  });

  // Estados para modales
  const [selectedProyecto, setSelectedProyecto] = useState<ProyectoAPI | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Estados para documentos y observaciones
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [currentViewDocument, setCurrentViewDocument] = useState<any>(null);
  const [observationText, setObservationText] = useState('');
  const [currentDocuments, setCurrentDocuments] = useState<DocumentoProyecto>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string>('');

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

  // Función para cargar documentos
  const cargarDocumentos = async (userId: string) => {
    try {
      if (!verificarToken()) return;
      
      setLoadingDocuments(true);
      setDocumentError('');
      
      const [certificateResponse, identityResponse, signedResponse] = await Promise.allSettled([
        apiService.getUserCertificate(userId),
        apiService.getUserIdentityDocument(userId), 
        apiService.getCurrentUserCertificate()
      ]);
      
      const documents: DocumentoProyecto = {};
      
      if (certificateResponse.status === 'fulfilled' && certificateResponse.value.success) {
        documents.certificate = certificateResponse.value.data;
      }
      
      if (identityResponse.status === 'fulfilled' && identityResponse.value.success) {
        documents.identityDocument = identityResponse.value.data;
      }
      
      if (signedResponse.status === 'fulfilled' && signedResponse.value.success) {
        documents.signedDocument = signedResponse.value.data;
      }
      
      setCurrentDocuments(documents);
      
      const hasDocuments = Object.values(documents).some(doc => doc);
      if (!hasDocuments) {
        setDocumentError('No se pudieron cargar los documentos. Verifique que el usuario tenga documentos subidos.');
      }
      
    } catch (err) {
      setDocumentError('Error de conexión al cargar los documentos.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Función para abrir ventana de documentos
  const abrirDocumentos = async (proyecto: ProyectoAPI) => {
    setSelectedProyecto(proyecto);
    setShowDocumentsModal(true);
    await cargarDocumentos(proyecto.id);
  };

  // Función para manejar rechazo con observación
  const iniciarRechazo = (proyecto: ProyectoAPI) => {
    setSelectedProyecto(proyecto);
    setObservationText('');
    setShowObservationModal(true);
  };

  // Función para enviar rechazo con observación
  const enviarRechazo = async () => {
    if (!selectedProyecto) return;
    
    if (!observationText.trim()) {
      alert('Por favor, ingrese una observación para el rechazo.');
      return;
    }

    if (observationText.trim().length < 10) {
      alert('La observación debe tener al menos 10 caracteres.');
      return;
    }
    
    try {
      if (!verificarToken()) return;
      
      setLoading(true);
      const response = await apiService.rechazarUsuario(selectedProyecto.id, observationText.trim());
      
      if (response.success) {
        setShowObservationModal(false);
        setObservationText('');
        setSelectedProyecto(null);
        setShowDocumentsModal(false);
        setCurrentDocuments({});
        setDocumentError('');
        
        await loadProyectos();
        setTimeout(() => filtrarProyectos(), 100);
        loadDashboardStats();
        
        alert(`Usuario rechazado exitosamente. ${response.message || 'Se ha enviado la notificación con la observación.'}`);
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al rechazar usuario');
        }
      }
    } catch (err) {
      alert('Error de conexión al rechazar usuario. Verifique su conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar documento
  const descargarDocumento = (documentData: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${documentData}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error al descargar el documento');
    }
  };

  // Función para abrir documento en visor
  const openDocumentViewer = (documentData: any, name: any, type: any) => {
    if (!documentData) {
      alert('Error: No hay datos del documento disponibles');
      return;
    }
    
    if (!name) {
      name = `documento_${type || 'desconocido'}.pdf`;
    }
    
    try {
      const documentToView = {
        data: documentData,
        name: name,
        type: type || 'pdf'
      };
      
      setCurrentViewDocument(documentToView);
      setShowDocumentViewer(true);
      
    } catch (error) {
      alert('Error al abrir el visor de documentos');
    }
  };

  // Cargar proyectos
  const loadProyectos = async (page: number = currentPage, size: number = pageSize) => {
    try {
      setLoading(true);
      setError('');
      
      if (!verificarToken()) {
        setLoading(false);
        return;
      }
      
      const response = await apiService.getProyectosPendientes(page, size);
      
      if (response.success && response.data) {
        const proyectosLimpios = response.data.content.filter(proyecto => proyecto && proyecto.id);
        
        const proyectosNormalizados = proyectosLimpios.map(proyecto => {
          const datosPrueba = {
            phone: '0987654321',
            address: 'Av. Amazonas y Naciones Unidas, Quito',
            email: 'usuario@ejemplo.com',
            cedula: '1234567890'
          };
          
          return {
            id: proyecto.id,
            nombre: proyecto.nombre || proyecto.name || proyecto.title || '',
            descripcion: proyecto.descripcion || proyecto.description || proyecto.desc || '',
            estado: validarEstado(proyecto.estado || proyecto.status),
            fechaEnvio: proyecto.fechaEnvio || proyecto.fecha_envio || '',
            responsable: proyecto.responsable || proyecto.responsible || proyecto.autor || '',
            presupuesto: proyecto.presupuesto || proyecto.budget || 0,
            categoria: proyecto.categoria || proyecto.category || proyecto.cat || '',
            fechaInicio: proyecto.fechaInicio || proyecto.fecha_inicio || proyecto.startDate || '',
            fechaFin: proyecto.fechaFin || proyecto.fecha_fin || proyecto.endDate || '',
            email: proyecto.email || proyecto.correo || proyecto.mail || datosPrueba.email,
            cedula: proyecto.cedula || proyecto.identification || proyecto.identificacion || datosPrueba.cedula,
            telefono: proyecto.phone || proyecto.telefono || proyecto.tel || proyecto.celular || datosPrueba.phone,
            address: proyecto.address || proyecto.direccion || proyecto.location || datosPrueba.address
          } as ProyectoAPI;
        });
        
        setProyectos(proyectosNormalizados);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setCurrentPage(response.data.pageable.pageNumber);
        
        setTimeout(() => filtrarProyectos(), 0);
        setRenderError('');
        
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
          apiService.clearToken();
          window.location.reload();
        } else {
          setError(response.error || response.message || 'Error al cargar proyectos');
        }
        setProyectos([]);
      }
    } catch (err) {
      setError('Error de conexión al cargar proyectos. Verifique su conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas desde el backend
  const loadDashboardStats = async () => {
    try {
      if (!verificarToken()) return;

      const [bizStatsRes, adminStatsRes] = await Promise.allSettled([
        apiService.getBusinessStats(),
        apiService.getAdminDashboardStats()
      ]);

      let total = 0, pending = 0, approved = 0, rejected = 0;

      if (bizStatsRes.status === 'fulfilled' && bizStatsRes.value.success && bizStatsRes.value.data) {
        const d: any = bizStatsRes.value.data;
        total = Number(d.total ?? d.totalUsers ?? 0);
        pending = Number(d.pending ?? d.pendingUsers ?? 0);
        approved = Number(d.approved ?? d.approvedUsers ?? 0);
        rejected = Number(d.rejected ?? d.rejectedUsers ?? 0);
      } else if (adminStatsRes.status === 'fulfilled' && adminStatsRes.value.success && adminStatsRes.value.data) {
        const d: any = adminStatsRes.value.data;
        total = Number(d.totalUsers ?? d.total ?? 0);
        pending = Number(d.pendingUsers ?? d.pending ?? 0);
        approved = Number(d.approvedUsers ?? d.approved ?? 0);
        rejected = Number(d.rejectedUsers ?? d.rejected ?? 0);
      }

      setStats({
        totalProyectos: total,
        pendientes: pending,
        aprobados: approved,
        rechazados: rejected
      });
    } catch (e) {
      console.warn('No se pudieron cargar estadísticas del backend');
    }
  };

  // Aprobar proyecto
  const aprobarProyecto = async (userId: string) => {
    try {
      if (!verificarToken()) return;
      
      setLoading(true);
      const response = await apiService.aprobarProyecto(userId);
      
      if (response.success) {
        await loadProyectos();
        setTimeout(() => filtrarProyectos(), 100);
        loadDashboardStats();
        alert('Proyecto aprobado exitosamente');
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al aprobar proyecto');
        }
      }
    } catch (err) {
      alert('Error de conexión al aprobar proyecto');
    } finally {
      setLoading(false);
    }
  };

  // Crear proyecto
  const crearProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProyecto.nombre.trim() || !newProyecto.descripcion.trim()) {
      alert('Nombre y descripción son requeridos');
      return;
    }
    
    try {
      if (!verificarToken()) return;
      
      setLoading(true);
      const proyectoData = {
        nombre: newProyecto.nombre.trim(),
        descripcion: newProyecto.descripcion.trim(),
        responsable: newProyecto.responsable.trim(),
        presupuesto: newProyecto.presupuesto ? parseFloat(newProyecto.presupuesto) : undefined,
        categoria: newProyecto.categoria.trim() || undefined,
        email: newProyecto.email.trim() || undefined,
        cedula: newProyecto.cedula.trim() || undefined,
        telefono: newProyecto.telefono.trim() || undefined,
        address: newProyecto.address.trim() || undefined
      };
      
      const response = await apiService.createProyecto(proyectoData);
      
      if (response.success) {
        setShowModal(false);
        setNewProyecto({
          nombre: '',
          descripcion: '',
          responsable: '',
          presupuesto: '',
          categoria: '',
          email: '',
          cedula: '',
          telefono: '',
          address: ''
        });
        await loadProyectos();
        alert('Proyecto creado exitosamente');
      } else {
        if (response.status === 401) {
          setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
          apiService.clearToken();
        } else {
          alert(response.error || 'Error al crear proyecto');
        }
      }
    } catch (err) {
      alert('Error de conexión al crear proyecto');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar página
  const changePage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      loadProyectos(newPage, pageSize);
    }
  };

  // Cambiar tamaño de página
  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    loadProyectos(0, newSize);
  };

  // Función para filtrar proyectos
  const filtrarProyectos = useCallback(() => {
    let proyectosFiltrados = proyectos;

    if (filterStatus !== 'all') {
      proyectosFiltrados = proyectosFiltrados.filter(proyecto => 
        proyecto.estado === filterStatus
      );
    }

    if (searchTerm.trim() !== '') {
      const terminoBusqueda = searchTerm.toLowerCase();
      proyectosFiltrados = proyectosFiltrados.filter(proyecto => 
        (proyecto.nombre && proyecto.nombre.toLowerCase().includes(terminoBusqueda)) ||
        (proyecto.email && proyecto.email.toLowerCase().includes(terminoBusqueda)) ||
        (proyecto.cedula && proyecto.cedula.toLowerCase().includes(terminoBusqueda)) ||
        (proyecto.telefono && proyecto.telefono.toLowerCase().includes(terminoBusqueda)) ||
        (proyecto.address && proyecto.address.toLowerCase().includes(terminoBusqueda)) ||
        (proyecto.categoria && proyecto.categoria.toLowerCase().includes(terminoBusqueda))
      );
    }

    proyectosFiltrados = proyectosFiltrados.filter(proyecto => 
      proyecto.nombre && proyecto.nombre.trim() !== ''
    );

    setProyectosFiltrados(proyectosFiltrados);
  }, [proyectos, filterStatus, searchTerm]);

  const handleFilterChange = (newFilter: string) => {
    setFilterStatus(newFilter);
    setCurrentPage(0);
    setTimeout(() => filtrarProyectos(), 0);
  };

  // Efectos
  useEffect(() => {
    const inicializar = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!verificarToken()) {
        setError('No hay sesión válida. Por favor, inicie sesión.');
        return;
      }
      
      loadProyectos();
      loadDashboardStats();
    };
    
    inicializar();
  }, []);

  useEffect(() => {
    if (!apiService.isAuthenticated()) return;
    
    const delayedSearch = setTimeout(() => {
      filtrarProyectos();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filtrarProyectos]);

  useEffect(() => {
    if (proyectos.length > 0) {
      filtrarProyectos();
    }
  }, [proyectos, filtrarProyectos]);

  const getStatusColor = (estado: string | undefined): string => {
    if (!estado) return 'bg-gray-100 text-gray-800';
    
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'aprobado': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      case 'en-progreso': return 'bg-blue-100 text-blue-800';
      case 'completado': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstadoText = (estado: string | undefined) => {
    if (!estado) return 'Sin estado';
    return estado.charAt(0).toUpperCase() + estado.slice(1).replace('-', ' ');
  };

  // Función para renderizar proyectos de forma segura
  const renderProyectos = () => {
    try {
      return proyectosFiltrados.map((proyecto) => {
        if (!proyecto || !proyecto.id) {
          return null;
        }

        const estadoProyecto = proyecto.estado || 'pendiente';
        
        const generarNombreDescriptivo = (proyecto: ProyectoAPI): string => {
          if (proyecto.nombre && proyecto.nombre.trim() !== '') {
            return proyecto.nombre;
          }
          
          if (proyecto.categoria && proyecto.categoria.trim() !== '') {
            return `${proyecto.categoria} #${proyecto.id}`;
          }
          
          if (proyecto.responsable && proyecto.responsable.trim() !== '') {
            return `Proyecto de ${proyecto.responsable} #${proyecto.id}`;
          }
          
          return `Proyecto #${proyecto.id} (Sin nombre)`;
        };
        
        const nombreProyecto = generarNombreDescriptivo(proyecto);

        return (
          <div key={proyecto.id} className="proyectos-card">
            <div className="proyectos-card-header">
              <div className="proyectos-card-title-group">
                <div className="proyectos-card-icon">
                  <FolderOpen />
                </div>
                <div>
                  <h3 className="proyectos-card-name" title={!proyecto.nombre || proyecto.nombre.trim() === '' ? 'Este proyecto no tiene nombre asignado' : ''}>
                    {nombreProyecto}
                    {(!proyecto.nombre || proyecto.nombre.trim() === '') && (
                      <span className="text-xs text-gray-500 ml-2">(Sin nombre)</span>
                    )}
                  </h3>
                  <p className="proyectos-card-category">{proyecto.categoria || 'General'}</p>
                </div>
              </div>
              <span className={`proyectos-card-status ${getStatusColor(estadoProyecto)}`}>
                {formatEstadoText(estadoProyecto)}
              </span>
            </div>

            <div className="proyectos-details-grid">
              <div>
                <p className="proyectos-detail-label">Correo Electrónico</p>
                <p className="proyectos-detail-value">
                  <User className="proyectos-detail-icon" />
                  {proyecto.email || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="proyectos-detail-label">Número de Cédula</p>
                <p className="proyectos-detail-value">
                  {proyecto.cedula || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="proyectos-detail-label">Número de Teléfono</p>
                <p className="proyectos-detail-value">
                  <User className="proyectos-detail-icon" />
                  {proyecto.telefono || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="proyectos-detail-label">Dirección</p>
                <p className="proyectos-detail-value">
                  {proyecto.address || 'No especificado'}
                </p>
              </div>
            </div>

            <div className="proyectos-card-footer">
              {estadoProyecto === 'pendiente' ? (
                <>
                  <button 
                    onClick={() => abrirDocumentos(proyecto)}
                    className="proyectos-action-button bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading || !apiService.isAuthenticated()}
                    title="Abrir documentos del proyecto"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Abrir</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setSelectedProyecto(proyecto);
                      setShowViewModal(true);
                    }}
                    className="proyectos-action-button bg-blue-600 hover:bg-blue-700 text-white"
                    title="Ver detalles del proyecto"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedProyecto(proyecto);
                      setNewProyecto({
                        nombre: proyecto.nombre || '',
                        descripcion: proyecto.descripcion || '',
                        responsable: proyecto.responsable || '',
                        presupuesto: proyecto.presupuesto?.toString() || '',
                        categoria: proyecto.categoria || '',
                        email: proyecto.email || '',
                        cedula: proyecto.cedula || '',
                        telefono: proyecto.telefono || '',
                        address: proyecto.address || ''
                      });
                      setShowEditModal(true);
                    }}
                    className="proyectos-action-button bg-yellow-600 hover:bg-yellow-700 text-white"
                    title="Editar proyecto"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={async () => {
                      if (!window.confirm('¿Está seguro que desea eliminar este proyecto? Esta acción no se puede deshacer.')) {
                        return;
                      }

                      try {
                        if (!verificarToken()) return;
                        
                        setLoading(true);
                        const response = await apiService.deleteProyecto(proyecto.id);
                        
                        if (response.success) {
                          await loadProyectos();
                          alert('Proyecto eliminado exitosamente');
                        } else {
                          if (response.status === 401) {
                            setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
                            apiService.clearToken();
                          } else {
                            alert(response.error || 'Error al eliminar proyecto');
                          }
                        }
                      } catch (err) {
                        alert('Error de conexión al eliminar proyecto');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="proyectos-action-button bg-red-600 hover:bg-red-700 text-white"
                    title="Eliminar proyecto"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
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
          <p className="text-red-600">Error al mostrar los proyectos. Revise la consola para más detalles.</p>
        </div>
      ];
    }
  };

  return (
    <div className="proyectos-container">
      <div className="proyectos-header">
        <h1 className="proyectos-title">
          <FolderOpen className="w-8 h-8 text-red-600 mr-3" />
          Gestión de Comerciantes
        </h1>
        <p className="proyectos-subtitle">
          Administración y aprobación de proyectos municipales
        </p>
      </div>

      {/* Mensaje de error mejorado con más contexto */}
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
                    loadProyectos();
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
      <div className="proyectos-stats-grid">
        <div className="proyectos-stat-card">
          <div className="proyectos-stat-content">
            <div>
              <p className="proyectos-stat-text-sm">Total Proyectos</p>
              <p className="proyectos-stat-text-lg">{stats.totalProyectos}</p>
            </div>
            <div className="proyectos-stat-icon-container bg-blue-100">
              <FolderOpen className="proyectos-stat-icon text-blue-600" />
            </div>
          </div>
        </div>
        <div className="proyectos-stat-card">
          <div className="proyectos-stat-content">
            <div>
              <p className="proyectos-stat-text-sm">Pendientes</p>
              <p className="proyectos-stat-text-lg">{stats.pendientes}</p>
            </div>
            <div className="proyectos-stat-icon-container bg-yellow-100">
              <Calendar className="proyectos-stat-icon text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="proyectos-stat-card">
          <div className="proyectos-stat-content">
            <div>
              <p className="proyectos-stat-text-sm">Aprobados</p>
              <p className="proyectos-stat-text-lg">{stats.aprobados}</p>
            </div>
            <div className="proyectos-stat-icon-container bg-green-100">
              <TrendingUp className="proyectos-stat-icon text-green-600" />
            </div>
          </div>
        </div>
        <div className="proyectos-stat-card">
          <div className="proyectos-stat-content">
            <div>
              <p className="proyectos-stat-text-sm">Rechazados</p>
              <p className="proyectos-stat-text-lg">{stats.rechazados}</p>
            </div>
            <div className="proyectos-stat-icon-container bg-red-100">
              <X className="proyectos-stat-icon text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="proyectos-filters">
        <div className="proyectos-filters-container">
          <div className="proyectos-search-container">
            <Search className="proyectos-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, cédula, teléfono o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(0);
                  filtrarProyectos();
                }
              }}
              className="proyectos-search-input"
              disabled={!apiService.isAuthenticated() || loading}
            />
          </div>

          <div className="proyectos-filters-actions">
            <div className="proyectos-filter-group">
              <Filter className="proyectos-filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="proyectos-filter-select"
                disabled={!apiService.isAuthenticated() || loading}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="en-progreso">En Progreso</option>
                <option value="completado">Completado</option>
              </select>
            </div>

            <div className="proyectos-filter-group">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(parseInt(e.target.value))}
                className="proyectos-filter-select"
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
              className="proyectos-add-button"
              disabled={loading || !apiService.isAuthenticated()}
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Proyecto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de carga mejorado */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2 text-gray-600">
            {proyectos.length === 0 ? 'Cargando proyectos...' : 'Actualizando...'}
          </span>
        </div>
      )}

      {/* Error de renderizado */}
      {renderError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-lg mr-2">💥</span>
            <span>Error al renderizar proyectos: {renderError}</span>
          </div>
        </div>
      )}
      
      {/* Indicador de proyectos filtrados */}
      {!loading && proyectosFiltrados.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {proyectosFiltrados.length} de {proyectos.length} proyectos
          {filterStatus !== 'all' && ` (filtrado por: ${formatEstadoText(filterStatus)})`}
          {searchTerm && ` (búsqueda: "${searchTerm}")`}
        </div>
      )}

      {/* Lista de proyectos */}
      <div className="proyectos-grid">
        {!loading && proyectosFiltrados.length === 0 && proyectos.length > 0 && (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron proyectos</p>
              <p className="text-sm">
                {filterStatus !== 'all' 
                  ? `No hay proyectos con estado "${formatEstadoText(filterStatus)}"`
                  : searchTerm 
                    ? `No hay proyectos que coincidan con "${searchTerm}" en nombre, correo, cédula, teléfono o dirección`
                    : 'No hay proyectos registrados'
                }
              </p>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSearchTerm('');
                  filtrarProyectos();
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
        {!loading && renderProyectos()}
      </div>

      {/* Mensaje cuando no hay proyectos */}
      {!loading && !renderError && proyectos.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proyectos</h3>
          <p className="text-gray-500 mb-4">
            {error ? 
              'Hubo un problema al cargar los proyectos.' :
              searchTerm || filterStatus !== 'all' ? 
                'No se encontraron proyectos con los filtros aplicados.' : 
                'Aún no hay proyectos registrados.'
            }
          </p>
          {!error && apiService.isAuthenticated() && (
            <button
              onClick={() => loadProyectos()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Recargar proyectos
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
                {' '}proyectos
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

      {/* Modal para nuevo proyecto */}
      {showModal && (
        <div className="proyectos-modal-overlay">
          <div className="proyectos-modal">
            <h2 className="proyectos-modal-title">Nuevo Proyecto</h2>
            <form onSubmit={crearProyecto} className="proyectos-modal-form">
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Nombre del Proyecto *</label>
                <input
                  type="text"
                  value={newProyecto.nombre}
                  onChange={(e) => setNewProyecto({...newProyecto, nombre: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="Ingrese el nombre del proyecto"
                  required
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Descripción *</label>
                <textarea
                  value={newProyecto.descripcion}
                  onChange={(e) => setNewProyecto({...newProyecto, descripcion: e.target.value})}
                  className="proyectos-form-textarea"
                  rows={3}
                  placeholder="Ingrese la descripción del proyecto"
                  required
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Categoría</label>
                <input
                  type="text"
                  value={newProyecto.categoria}
                  onChange={(e) => setNewProyecto({...newProyecto, categoria: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="Categoría del proyecto"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Correo Electrónico</label>
                <input
                  type="email"
                  value={newProyecto.email}
                  onChange={(e) => setNewProyecto({...newProyecto, email: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="correo@ejemplo.com"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Número de Cédula</label>
                <input
                  type="text"
                  value={newProyecto.cedula}
                  onChange={(e) => setNewProyecto({...newProyecto, cedula: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="1234567890"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Número de Teléfono</label>
                <input
                  type="tel"
                  value={newProyecto.telefono}
                  onChange={(e) => setNewProyecto({...newProyecto, telefono: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="0987654321"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Dirección</label>
                <textarea
                  value={newProyecto.address}
                  onChange={(e) => setNewProyecto({...newProyecto, address: e.target.value})}
                  className="proyectos-form-textarea"
                  rows={2}
                  placeholder="Ingrese la dirección completa"
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="proyectos-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="proyectos-cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="proyectos-submit-button"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  {loading ? 'Creando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver documentos - EXACTAMENTE COMO EN TU IMAGEN */}
      {showDocumentsModal && selectedProyecto && (
        <div className="proyectos-modal-overlay">
          <div className="proyectos-modal max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="proyectos-modal-title">
                Documentos del Proyecto: {selectedProyecto.nombre}
              </h2>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedProyecto(null);
                  setCurrentDocuments({});
                  setDocumentError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Información del proyecto */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p className="text-gray-900">{selectedProyecto.email || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Cédula:</span>
                  <p className="text-gray-900">{selectedProyecto.cedula || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedProyecto.estado)}`}>
                    {formatEstadoText(selectedProyecto.estado)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error al cargar documentos */}
            {documentError && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                <div className="flex items-center">
                  <span className="text-lg mr-2">⚠️</span>
                  <span>{documentError}</span>
                </div>
              </div>
            )}

            {/* Indicador de carga de documentos */}
            {loadingDocuments && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando documentos...</span>
              </div>
            )}

            {/* Documentos Disponibles - EXACTO COMO TU IMAGEN */}
            {!loadingDocuments && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documentos Disponibles</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Certificado - EXACTO COMO TU IMAGEN */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">Certificado</span>
                      </div>
                      {currentDocuments.certificate && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Disponible
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Certificado oficial del proyecto
                    </p>
                    {currentDocuments.certificate ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => openDocumentViewer(
                            currentDocuments.certificate!, 
                            `certificado_${selectedProyecto.id}.pdf`, 
                            'certificate'
                          )}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </button>
                        <button
                          onClick={() => descargarDocumento(currentDocuments.certificate!, `certificado_${selectedProyecto.id}.pdf`)}
                          className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </button>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-100 text-gray-500 px-3 py-2 rounded text-sm text-center">
                        No disponible
                      </div>
                    )}
                  </div>

                  {/* Documento de Identidad - EXACTO COMO TU IMAGEN */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-gray-900">Cédula</span>
                      </div>
                      {currentDocuments.identityDocument && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Disponible
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Documento de identidad escaneado
                    </p>
                    {currentDocuments.identityDocument ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => openDocumentViewer(
                            currentDocuments.identityDocument!, 
                            `cedula_${selectedProyecto.id}.jpg`, 
                            'identity'
                          )}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </button>
                        <button
                          onClick={() => descargarDocumento(currentDocuments.identityDocument!, `cedula_${selectedProyecto.id}.jpg`)}
                          className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </button>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-100 text-gray-500 px-3 py-2 rounded text-sm text-center">
                        No disponible
                      </div>
                    )}
                  </div>

                  {/* Documento Firmado - EXACTO COMO TU IMAGEN */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-purple-600 mr-2" />
                        <span className="font-medium text-gray-900">Documento Firmado</span>
                      </div>
                      {currentDocuments.signedDocument && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Disponible
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      PDF con aprobaciones firmadas
                    </p>
                    {currentDocuments.signedDocument ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => openDocumentViewer(
                            currentDocuments.signedDocument!, 
                            `documento_firmado_${selectedProyecto.id}.pdf`, 
                            'signed'
                          )}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </button>
                        <button
                          onClick={() => descargarDocumento(currentDocuments.signedDocument!, `documento_firmado_${selectedProyecto.id}.pdf`)}
                          className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors flex items-center justify-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </button>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-100 text-gray-500 px-3 py-2 rounded text-sm text-center">
                        No disponible
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedProyecto(null);
                  setCurrentDocuments({});
                  setDocumentError('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDocumentsModal(false);
                    iniciarRechazo(selectedProyecto);
                  }}
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors flex items-center"
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </button>
                
                <button
                  onClick={() => {
                    setShowDocumentsModal(false);
                    aprobarProyecto(selectedProyecto.id);
                  }}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors flex items-center"
                  disabled={loading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para observaciones de rechazo */}
      {showObservationModal && selectedProyecto && (
        <div className="proyectos-modal-overlay">
          <div className="proyectos-modal max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="proyectos-modal-title text-red-600">
                <MessageSquare className="inline w-6 h-6 mr-2" />
                Rechazar Usuario: {selectedProyecto.nombre}
              </h2>
              <button
                onClick={() => {
                  setShowObservationModal(false);
                  setSelectedProyecto(null);
                  setObservationText('');
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Información del usuario */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <span className="text-red-600 font-medium">Usuario a rechazar:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p className="text-gray-900">{selectedProyecto.email || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Cédula:</span>
                  <p className="text-gray-900">{selectedProyecto.cedula || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Teléfono:</span>
                  <p className="text-gray-900">{selectedProyecto.telefono || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ID Usuario:</span>
                  <p className="text-gray-900 font-mono text-xs">{selectedProyecto.id}</p>
                </div>
              </div>
            </div>

            {/* Formulario de observación */}
            <form onSubmit={(e) => {
              e.preventDefault();
              enviarRechazo();
            }}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Observación del Rechazo *
                  <span className="text-xs text-gray-500 ml-1">(Mínimo 10, máximo 500 caracteres)</span>
                </label>
                <textarea
                  value={observationText}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setObservationText(e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors ${
                    observationText.trim().length >= 10 
                      ? 'border-gray-300 focus:ring-red-500' 
                      : 'border-red-300 focus:ring-red-400'
                  }`}
                  rows={8}
                  placeholder="Ingrese las razones del rechazo, observaciones sobre la documentación, o mejoras requeridas para que el usuario pueda corregir su solicitud..."
                  required
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${
                    observationText.trim().length >= 10 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {observationText.trim().length >= 10 ? '✓ Longitud válida' : 'Mínimo 10 caracteres requeridos'}
                  </span>
                  <span className={`text-xs ${observationText.length > 450 ? 'text-red-600' : 'text-gray-500'}`}>
                    {observationText.length}/500 caracteres
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowObservationModal(false);
                    setSelectedProyecto(null);
                    setObservationText('');
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || observationText.trim().length < 10}
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

            {/* Información adicional */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">💡</span>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Importante:</p>
                  <p>
                    El usuario recibirá una notificación con su observación y no podrá continuar con su solicitud hasta corregir los problemas indicados. 
                    Sea específico sobre los cambios requeridos.
                  </p>
                </div>
              </div>
            </div>

            {/* Advertencia de acción irreversible */}
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-red-600 mr-2">⚠️</span>
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Advertencia:</p>
                  <p>
                    Esta acción rechazará definitivamente al usuario. Asegúrese de que la observación sea clara y constructiva.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver proyecto */}
      {showViewModal && selectedProyecto && (
        <div className="proyectos-modal-overlay">
          <div className="proyectos-modal max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="proyectos-modal-title">Detalles del Proyecto</h2>
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
                    Nombre del Proyecto
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedProyecto.nombre || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedProyecto.estado)}`}>
                    {formatEstadoText(selectedProyecto.estado)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedProyecto.categoria || 'General'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedProyecto.email || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cédula
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedProyecto.cedula || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Teléfono
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedProyecto.telefono || 'No especificado'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedProyecto.address || 'No especificado'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded min-h-[100px]">
                  {selectedProyecto.descripcion || 'Sin descripción disponible'}
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

      {/* Modal para editar proyecto */}
      {showEditModal && selectedProyecto && (
        <div className="proyectos-modal-overlay">
          <div className="proyectos-modal">
            <div className="flex justify-between items-center mb-6">
              <h2 className="proyectos-modal-title">Editar Proyecto</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!newProyecto.nombre.trim() || !newProyecto.descripcion.trim()) {
                alert('Nombre y descripción son requeridos');
                return;
              }
              
              try {
                if (!verificarToken()) return;
                
                setLoading(true);
                const proyectoData = {
                  nombre: newProyecto.nombre.trim(),
                  descripcion: newProyecto.descripcion.trim(),
                  responsable: newProyecto.responsable.trim(),
                  presupuesto: newProyecto.presupuesto ? parseFloat(newProyecto.presupuesto) : undefined,
                  categoria: newProyecto.categoria.trim() || undefined,
                  email: newProyecto.email.trim() || undefined,
                  cedula: newProyecto.cedula.trim() || undefined,
                  telefono: newProyecto.telefono.trim() || undefined,
                  address: newProyecto.address.trim() || undefined
                };
                
                const response = await apiService.updateProyecto(selectedProyecto.id, proyectoData);
                
                if (response.success) {
                  setShowEditModal(false);
                  setSelectedProyecto(null);
                  setNewProyecto({
                    nombre: '',
                    descripcion: '',
                    responsable: '',
                    presupuesto: '',
                    categoria: '',
                    email: '',
                    cedula: '',
                    telefono: '',
                    address: ''
                  });
                  await loadProyectos();
                  alert('Proyecto actualizado exitosamente');
                } else {
                  if (response.status === 401) {
                    setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
                    apiService.clearToken();
                  } else {
                    alert(response.error || 'Error al actualizar proyecto');
                  }
                }
              } catch (err) {
                alert('Error de conexión al actualizar proyecto');
              } finally {
                setLoading(false);
              }
            }} className="proyectos-modal-form">
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Nombre del Proyecto *</label>
                <input
                  type="text"
                  value={newProyecto.nombre}
                  onChange={(e) => setNewProyecto({...newProyecto, nombre: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="Ingrese el nombre del proyecto"
                  required
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Descripción *</label>
                <textarea
                  value={newProyecto.descripcion}
                  onChange={(e) => setNewProyecto({...newProyecto, descripcion: e.target.value})}
                  className="proyectos-form-textarea"
                  rows={3}
                  placeholder="Ingrese la descripción del proyecto"
                  required
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Categoría</label>
                <input
                  type="text"
                  value={newProyecto.categoria}
                  onChange={(e) => setNewProyecto({...newProyecto, categoria: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="Categoría del proyecto"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Correo Electrónico</label>
                <input
                  type="email"
                  value={newProyecto.email}
                  onChange={(e) => setNewProyecto({...newProyecto, email: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="correo@ejemplo.com"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Número de Cédula</label>
                <input
                  type="text"
                  value={newProyecto.cedula}
                  onChange={(e) => setNewProyecto({...newProyecto, cedula: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="1234567890"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Número de Teléfono</label>
                <input
                  type="tel"
                  value={newProyecto.telefono}
                  onChange={(e) => setNewProyecto({...newProyecto, telefono: e.target.value})}
                  className="proyectos-form-input"
                  placeholder="0987654321"
                  disabled={!apiService.isAuthenticated() || loading}
                />
              </div>
              
              <div className="proyectos-form-group">
                <label className="proyectos-form-label">Dirección</label>
                <textarea
                  value={newProyecto.address}
                  onChange={(e) => setNewProyecto({...newProyecto, address: e.target.value})}
                  className="proyectos-form-textarea"
                  rows={2}
                  placeholder="Ingrese la dirección completa"
                  disabled={!apiService.isAuthenticated() || loading}
                ></textarea>
              </div>
              
              <div className="proyectos-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProyecto(null);
                    setNewProyecto({
                      nombre: '',
                      descripcion: '',
                      responsable: '',
                      presupuesto: '',
                      categoria: '',
                      email: '',
                      cedula: '',
                      telefono: '',
                      address: ''
                    });
                  }}
                  className="proyectos-cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="proyectos-submit-button"
                  disabled={loading || !apiService.isAuthenticated()}
                >
                  {loading ? 'Actualizando...' : 'Actualizar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de documentos - VENTANA FLOTANTE COMPLETA */}
      <DocumentViewer
        isOpen={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setCurrentViewDocument(null);
        }}
        documentData={currentViewDocument?.data}
        documentName={currentViewDocument?.name}
        documentType={currentViewDocument?.type}
      />

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs max-w-xs">
          <p>Debug Info:</p>
          <p>Auth: {apiService.isAuthenticated() ? '✅' : '❌'}</p>
          <p>Token: {apiService.getCurrentToken() ? '✅' : '❌'}</p>
          <p>Expired: {apiService.isTokenExpired() ? '❌' : '✅'}</p>
          <p>Proyectos: {proyectos.length}</p>
          <p>Render Error: {renderError ? '❌' : '✅'}</p>
          {renderError && <p className="text-red-300 text-xs">Error: {renderError}</p>}
        </div>
      )}
    </div>
  );
};

export default Proyectos;