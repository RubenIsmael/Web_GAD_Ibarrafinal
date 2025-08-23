import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Filter, MapPin, Phone, Mail, Eye, Edit, Trash2, Building, User, Calendar, FileText, Download, MessageSquare, Send, X, Check, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
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

// Interface para documentos del negocio
interface DocumentoNegocio {
  cedula?: string;
  logo?: string;
  signature?: string;
}

// Componente DocumentViewer mejorado
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar documento</h3>
            <p className="text-gray-500 mb-4">No se pudieron cargar los datos del documento</p>
            <button onClick={onClose} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
    
    return { fileType: 'image', mimeType: 'image/jpeg' };
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 truncate" title={documentName}>
                {documentName}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {fileType === 'image' && !loading && imageLoaded && (
                <>
                  <button onClick={handleZoomOut} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50" disabled={zoom <= 25}>
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[50px] text-center">{zoom}%</span>
                  <button onClick={handleZoomIn} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50" disabled={zoom >= 200}>
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={handleRotate} className="p-2 text-gray-400 hover:text-gray-600">
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Cargando documento...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar</h3>
              <p className="text-gray-500">{error}</p>
            </div>
          ) : fileType === 'pdf' ? (
            <iframe
              src={dataUrl}
              className="w-full h-[50vh] border rounded"
              title={documentName}
              onError={() => setError('Error al cargar el archivo PDF')}
            />
          ) : (
            <div className="flex justify-center">
              {!imageLoaded && !error && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-gray-600">Cargando imagen...</span>
                </div>
              )}
              <img
                src={dataUrl}
                alt={documentName}
                className="max-w-full h-auto rounded shadow-lg"
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

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {fileType === 'pdf' ? 'Documento PDF' : 'Imagen'} • {documentName}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDownload} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center"
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </button>
              <button 
                onClick={onClose} 
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente mejorado para la ventana flotante de detalles del emprendimiento
const EmprendimientoDetailModal = ({ 
  isOpen, 
  onClose, 
  emprendimiento, 
  onApprove, 
  onReject,
  loading 
}: {
  isOpen: boolean;
  onClose: () => void;
  emprendimiento: BusinessAPI | null;
  onApprove: (id: number) => void;
  onReject: (emprendimiento: BusinessAPI) => void;
  loading: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');
  const [documents, setDocuments] = useState<DocumentoNegocio>({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [currentViewDocument, setCurrentViewDocument] = useState<any>(null);

  // Cargar documentos cuando se abre el modal
  useEffect(() => {
    if (isOpen && emprendimiento) {
      loadDocuments();
    }
  }, [isOpen, emprendimiento]);

  const loadDocuments = async () => {
    if (!emprendimiento) return;
    
    setLoadingDocs(true);
    setDocumentError('');
    
    try {
      const docs: DocumentoNegocio = {};
      
      // Cargar documentos desde las URLs del emprendimiento
      if (emprendimiento.cedulaFileUrl) {
        docs.cedula = emprendimiento.cedulaFileUrl;
      }
      
      if (emprendimiento.logoUrl) {
        docs.logo = emprendimiento.logoUrl;
      }
      
      if (emprendimiento.signatureUrl) {
        docs.signature = emprendimiento.signatureUrl;
      }
      
      setDocuments(docs);
      
      const hasDocuments = Object.values(docs).some(doc => doc);
      if (!hasDocuments) {
        setDocumentError('No se encontraron documentos para este emprendimiento.');
      }
      
    } catch (error) {
      setDocumentError('Error al cargar los documentos.');
    } finally {
      setLoadingDocs(false);
    }
  };

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  if (!isOpen || !emprendimiento) return null;

  const getStatusColor = (estado: string | undefined): string => {
    switch (estado) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstadoText = (estado: string | undefined) => {
    switch (estado) {
      case 'PENDING': return 'Pendiente';
      case 'APPROVED': return 'Aprobado';
      case 'REJECTED': return 'Rechazado';
      default: return estado || 'Sin estado';
    }
  };

  const formatDeliveryService = (service: string | undefined) => {
    switch (service) {
      case 'BAJO_PEDIDO': return 'Bajo pedido';
      case 'DISPONIBLE': return 'Disponible';
      case 'NO_DISPONIBLE': return 'No disponible';
      default: return service || 'No especificado';
    }
  };

  const formatSalePlace = (place: string | undefined) => {
    switch (place) {
      case 'FERIAS': return 'Ferias';
      case 'LOCAL': return 'Local';
      case 'DOMICILIO': return 'Domicilio';
      case 'ONLINE': return 'Online';
      default: return place || 'No especificado';
    }
  };

  // Función para obtener descripción corta del emprendimiento
  const getShortDescription = (description: string | undefined, maxLength: number = 100): string => {
    if (!description) return 'Sin descripción disponible';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                  {emprendimiento.logoUrl ? (
                    <img 
                      src={emprendimiento.logoUrl} 
                      alt={`Logo de ${emprendimiento.commercialName}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLElement;
                        if (nextElement) nextElement.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <Store className="w-8 h-8 text-red-600" style={{ display: emprendimiento.logoUrl ? 'none' : 'block' }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {emprendimiento.commercialName}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-gray-600">
                      {emprendimiento.category?.name || 'General'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emprendimiento.validationStatus)}`}>
                      {formatEstadoText(emprendimiento.validationStatus)}
                    </span>
                  </div>
                  {/* Descripción corta en el header */}
                  <p className="text-sm text-gray-600 mt-2 max-w-md">
                    {getShortDescription(emprendimiento.description, 120)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'info'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Información del Emprendimiento
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'documents'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Documentos
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Comercial
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {emprendimiento.commercialName || 'No especificado'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Representante
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {emprendimiento.representativeName || 'No especificado'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        RUC/Cédula
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {emprendimiento.cedulaOrRuc || 'No especificado'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {emprendimiento.email || 'No especificado'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {emprendimiento.phone || 'No especificado'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sector/Parroquia
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {emprendimiento.parishCommunitySector || 'No especificado'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lugar de Venta
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {formatSalePlace(emprendimiento.salePlace)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {formatDeliveryService(emprendimiento.deliveryService)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Descripción completa */}
                {emprendimiento.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción Completa del Emprendimiento
                    </label>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {emprendimiento.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Productos y servicios */}
                {emprendimiento.productsServices && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Productos y Servicios
                    </label>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {emprendimiento.productsServices}
                      </p>
                    </div>
                  </div>
                )}

                {/* Redes sociales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Redes Sociales y Sitio Web
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {emprendimiento.facebook && (
                      <a
                        href={emprendimiento.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
                      >
                        Facebook
                      </a>
                    )}
                    {emprendimiento.instagram && (
                      <a
                        href={emprendimiento.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-pink-100 text-pink-800 px-3 py-1 rounded text-sm hover:bg-pink-200 transition-colors"
                      >
                        Instagram
                      </a>
                    )}
                    {emprendimiento.tiktok && (
                      <a
                        href={emprendimiento.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        TikTok
                      </a>
                    )}
                    {emprendimiento.website && (
                      <a
                        href={emprendimiento.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm hover:bg-green-200 transition-colors"
                      >
                        Sitio Web
                      </a>
                    )}
                    {!emprendimiento.facebook && !emprendimiento.instagram && !emprendimiento.tiktok && !emprendimiento.website && (
                      <span className="text-gray-500 text-sm">No especificado</span>
                    )}
                  </div>
                </div>

                {/* Información adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Acepta pedidos por WhatsApp
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {emprendimiento.acceptsWhatsappOrders ? 'Sí' : 'No'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Registro
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {emprendimiento.registrationDate 
                        ? new Date(emprendimiento.registrationDate).toLocaleDateString('es-ES')
                        : 'No especificado'
                      }
                    </p>
                  </div>
                </div>

                {/* Soporte UDEL */}
                {(emprendimiento.receivedUdelSupport || emprendimiento.udelSupportDetails) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Soporte UDEL
                    </label>
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-sm text-gray-900 mb-2">
                        <strong>Ha recibido soporte:</strong> {emprendimiento.receivedUdelSupport ? 'Sí' : 'No'}
                      </p>
                      {emprendimiento.udelSupportDetails && (
                        <p className="text-sm text-gray-700">
                          <strong>Detalles:</strong> {emprendimiento.udelSupportDetails}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                {loadingDocs ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-gray-600">Cargando documentos...</span>
                  </div>
                ) : documentError ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{documentError}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Cédula/RUC */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Cédula/RUC
                      </h3>
                      {documents.cedula ? (
                        <div className="space-y-3">
                          <img
                            src={documents.cedula}
                            alt="Cédula/RUC"
                            className="w-full h-40 object-cover rounded border"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const nextElement = target.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'block';
                            }}
                          />
                          <div style={{ display: 'none' }} className="text-center py-8 text-gray-500">
                            Error al cargar imagen
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openDocumentViewer(
                                documents.cedula!, 
                                `cedula_${emprendimiento.id}.jpg`, 
                                'identity'
                              )}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </button>
                            <button
                              onClick={() => downloadDocument(documents.cedula!, `cedula_${emprendimiento.id}.jpg`)}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No disponible</p>
                        </div>
                      )}
                    </div>

                    {/* Logo */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Building className="w-5 h-5 mr-2 text-green-600" />
                        Logo
                      </h3>
                      {documents.logo ? (
                        <div className="space-y-3">
                          <img
                            src={documents.logo}
                            alt="Logo del emprendimiento"
                            className="w-full h-40 object-cover rounded border"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const nextElement = target.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'block';
                            }}
                          />
                          <div style={{ display: 'none' }} className="text-center py-8 text-gray-500">
                            Error al cargar imagen
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openDocumentViewer(
                                documents.logo!, 
                                `logo_${emprendimiento.id}.jpg`, 
                                'logo'
                              )}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </button>
                            <button
                              onClick={() => downloadDocument(documents.logo!, `logo_${emprendimiento.id}.jpg`)}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Building className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No disponible</p>
                        </div>
                      )}
                    </div>

                    {/* Firma */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Edit className="w-5 h-5 mr-2 text-purple-600" />
                        Firma
                      </h3>
                      {documents.signature ? (
                        <div className="space-y-3">
                          <img
                            src={documents.signature}
                            alt="Firma"
                            className="w-full h-40 object-cover rounded border"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const nextElement = target.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'block';
                            }}
                          />
                          <div style={{ display: 'none' }} className="text-center py-8 text-gray-500">
                            Error al cargar imagen
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openDocumentViewer(
                                documents.signature!, 
                                `firma_${emprendimiento.id}.jpg`, 
                                'signature'
                              )}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </button>
                            <button
                              onClick={() => downloadDocument(documents.signature!, `firma_${emprendimiento.id}.jpg`)}
                              className="flex-1 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 transition-colors flex items-center justify-center"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </button>
                          </div>
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
              </div>
            )}
          </div>

          {/* Footer con botones de acción */}
          {emprendimiento.validationStatus === 'PENDING' && (
            <div className="border-t border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={onClose}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cerrar
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => onReject(emprendimiento)}
                    className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors flex items-center"
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rechazar
                  </button>
                  
                  <button
                    onClick={() => onApprove(emprendimiento.id)}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors flex items-center"
                    disabled={loading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aprobar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visor de documentos */}
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
    </>
  );
};

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

  // NUEVOS ESTADOS para la ventana flotante de emprendimiento
  const [showEmprendimientoModal, setShowEmprendimientoModal] = useState(false);
  const [selectedEmprendimiento, setSelectedEmprendimiento] = useState<BusinessAPI | null>(null);

  // Estados para observaciones de rechazo
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [observationText, setObservationText] = useState('');

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

  // NUEVA FUNCIÓN para abrir la ventana de emprendimiento
  const abrirEmprendimiento = (negocio: BusinessAPI) => {
    setSelectedEmprendimiento(negocio);
    setShowEmprendimientoModal(true);
  };

  // NUEVA FUNCIÓN para cerrar la ventana de emprendimiento
  const cerrarEmprendimiento = () => {
    setShowEmprendimientoModal(false);
    setSelectedEmprendimiento(null);
  };

  // Función para manejar rechazo con observación
  const iniciarRechazo = (negocio: BusinessAPI) => {
    setSelectedEmprendimiento(negocio);
    setObservationText('');
    setShowObservationModal(true);
    setShowEmprendimientoModal(false);
  };

  // Función para enviar rechazo con observación
  const enviarRechazo = async () => {
    if (!selectedEmprendimiento) return;

    if (!observationText.trim()) {
      alert('Por favor, ingrese una observación para el rechazo.');
      return;
    }

    try {
      if (!verificarToken()) return;

      setLoading(true);
      console.log('❌ Rechazando negocio con observación:', {
        negocioId: selectedEmprendimiento.id,
        observacion: observationText.trim()
      });

      // Intentar múltiples enfoques para el rechazo
      const rejectionMethods = [
        // Método 1: Endpoint directo de rechazo
        async () => {
          console.log('🔄 Método 1: Endpoint directo de rechazo');
          return await apiService.request<{ message: string }>(`/business/reject/${selectedEmprendimiento.id}`, {
            method: 'POST',
            body: JSON.stringify({
              observacion: observationText.trim(),
              observations: observationText.trim(),
              reason: observationText.trim(),
              rejectionReason: observationText.trim(),
              timestamp: new Date().toISOString(),
              rejectedBy: 'admin'
            })
          });
        },
        
        // Método 2: Actualizar estado del negocio con observaciones
        async () => {
          console.log('🔄 Método 2: Actualizar estado con observaciones');
          return await apiService.request<{ message: string }>(`/business/${selectedEmprendimiento.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              validationStatus: 'REJECTED',
              rejectionReason: observationText.trim(),
              rejectedBy: 'admin',
              rejectionDate: new Date().toISOString()
            })
          });
        },
        
        // Método 3: PATCH del estado con observaciones
        async () => {
          console.log('🔄 Método 3: PATCH del estado con observaciones');
          return await apiService.request<{ message: string }>(`/business/${selectedEmprendimiento.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              validationStatus: 'REJECTED',
              observations: observationText.trim()
            })
          });
        },
        
        // Método 4: Endpoint alternativo
        async () => {
          console.log('🔄 Método 4: Endpoint alternativo');
          return await apiService.request<{ message: string }>(`/business/${selectedEmprendimiento.id}/reject`, {
            method: 'POST',
            body: JSON.stringify({
              reason: observationText.trim()
            })
          });
        }
      ];

      let response;
      let lastError;

      for (const method of rejectionMethods) {
        try {
          response = await method();
          
          if (response.success) {
            console.log('✅ Negocio rechazado exitosamente con método exitoso');

            // Cerrar modal de observación
            setShowObservationModal(false);
            setObservationText('');
            setSelectedEmprendimiento(null);

            // Recargar negocios
            await loadNegocios();
            setTimeout(() => filtrarNegocios(), 100);

            alert('Mensaje enviado. El negocio ha sido rechazado con la observación correspondiente.');
            return;
          } else if (response.status !== 404 && response.status !== 500) {
            // Si no es 404 o 500, probablemente es un error de permisos o datos
            lastError = response;
            break;
          }
          
          lastError = response;
        } catch (methodError) {
          console.warn('⚠️ Método de rechazo falló:', methodError);
          lastError = {
            success: false,
            error: 'Error de conexión',
            status: 500
          };
        }
      }

      // Si llegamos aquí, todos los métodos fallaron
      console.error('❌ Todos los métodos de rechazo fallaron');
      console.error('❌ Último error:', lastError);
      
      if (lastError?.status === 401) {
        setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
        apiService.clearToken();
      } else if (lastError?.status === 403) {
        alert('No tiene permisos para rechazar negocios. Contacte al administrador.');
      } else if (lastError?.status === 500) {
        alert('Error interno del servidor. El endpoint puede no estar configurado correctamente. Contacte al equipo de desarrollo.');
      } else {
        alert(`Error al rechazar negocio: ${lastError?.error || 'Error desconocido'}`);
      }
      
    } catch (err) {
      console.error('💥 Error de conexión al rechazar negocio:', err);
      alert('Error de conexión al rechazar negocio. Verifique su conexión a internet.');
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

      // Intentar múltiples enfoques para la aprobación
      const approvalMethods = [
        // Método 1: Endpoint directo de aprobación
        async () => {
          console.log('🔄 Método 1: Endpoint directo de aprobación');
          return await apiService.request<BusinessAPI>(`/business/approve/${businessId}`, {
            method: 'POST'
          });
        },
        
        // Método 2: Actualizar estado del negocio
        async () => {
          console.log('🔄 Método 2: Actualizar estado del negocio');
          return await apiService.request<BusinessAPI>(`/business/${businessId}`, {
            method: 'PUT',
            body: JSON.stringify({
              validationStatus: 'APPROVED',
              approvedBy: 'admin',
              approvalDate: new Date().toISOString()
            })
          });
        },
        
        // Método 3: PATCH del estado
        async () => {
          console.log('🔄 Método 3: PATCH del estado');
          return await apiService.request<BusinessAPI>(`/business/${businessId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              validationStatus: 'APPROVED'
            })
          });
        },
        
        // Método 4: Endpoint alternativo
        async () => {
          console.log('🔄 Método 4: Endpoint alternativo');
          return await apiService.request<BusinessAPI>(`/business/${businessId}/approve`, {
            method: 'POST'
          });
        }
      ];

      let response;
      let lastError;

      for (const method of approvalMethods) {
        try {
          response = await method();
          
          if (response.success) {
            console.log('🎉 Negocio aprobado exitosamente con método exitoso');
            
            // Cerrar modal si está abierto
            setShowEmprendimientoModal(false);
            setSelectedEmprendimiento(null);
            
            await loadNegocios();
            setTimeout(() => filtrarNegocios(), 100);
            alert('Negocio aprobado exitosamente');
            return;
          } else if (response.status !== 404 && response.status !== 500) {
            // Si no es 404 o 500, probablemente es un error de permisos o datos
            lastError = response;
            break;
          }
          
          lastError = response;
        } catch (methodError) {
          console.warn('⚠️ Método falló:', methodError);
          lastError = {
            success: false,
            error: 'Error de conexión',
            status: 500
          };
        }
      }

      // Si llegamos aquí, todos los métodos fallaron
      console.error('❌ Todos los métodos de aprobación fallaron');
      console.error('❌ Último error:', lastError);
      
      if (lastError?.status === 401) {
        setError('Su sesión ha expirado. Recargue la página e inicie sesión nuevamente.');
        apiService.clearToken();
      } else if (lastError?.status === 403) {
        alert('No tiene permisos para aprobar negocios. Contacte al administrador.');
      } else if (lastError?.status === 500) {
        alert('Error interno del servidor. El endpoint puede no estar configurado correctamente. Contacte al equipo de desarrollo.');
      } else {
        alert(`Error al aprobar negocio: ${lastError?.error || 'Error desconocido'}`);
      }
      
    } catch (err) {
      console.error('💥 Error de conexión al aprobar negocio:', err);
      alert('Error de conexión al aprobar negocio. Verifique su conexión a internet.');
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

  // Función para obtener descripción corta
  const getShortDescription = (description: string | undefined, maxLength: number = 80): string => {
    if (!description) return 'Sin descripción disponible';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
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

      {/* Lista de locales - CON DESCRIPCIÓN CORTA Y BOTÓN VER ÚNICAMENTE */}
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
                    {negocio.logoUrl ? (
                      <img 
                        src={negocio.logoUrl} 
                        alt={`Logo de ${negocio.commercialName}`}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          const nextElement = target.nextElementSibling as HTMLElement;
                          if (nextElement) nextElement.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <Store style={{ display: negocio.logoUrl ? 'none' : 'block' }} />
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
                    {/* NUEVA LÍNEA - Emprendimiento ID */}
                    <p className="text-xs text-gray-500 mt-1">Emprendimiento #{negocio.id}</p>
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

                {/* Descripción corta del emprendimiento */}
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 mb-1">Descripción del emprendimiento:</p>
                  <p className="text-sm text-gray-900">
                    {getShortDescription(negocio.description)}
                  </p>
                </div>
              </div>

              {/* BOTÓN VER ÚNICO - COMO SOLICITASTE */}
              <div className="locales-card-actions">
                <button
                  onClick={() => abrirEmprendimiento(negocio)}
                  className="locales-action-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                  disabled={loading || !apiService.isAuthenticated()}
                  title="Ver detalles completos del emprendimiento"
                >
                  <Eye className="w-5 h-5" />
                  <span>Ver</span>
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

      {/* NUEVA VENTANA FLOTANTE DE EMPRENDIMIENTO MEJORADA */}
      <EmprendimientoDetailModal
        isOpen={showEmprendimientoModal}
        onClose={cerrarEmprendimiento}
        emprendimiento={selectedEmprendimiento}
        onApprove={aprobarNegocio}
        onReject={iniciarRechazo}
        loading={loading}
      />

      {/* Modal para observación de rechazo */}
      {showObservationModal && selectedEmprendimiento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-red-600 flex items-center">
                  <MessageSquare className="w-6 h-6 mr-2" />
                  Rechazar Emprendimiento: {selectedEmprendimiento.commercialName}
                </h2>
                <button
                  onClick={() => {
                    setShowObservationModal(false);
                    setSelectedEmprendimiento(null);
                    setObservationText('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Información del emprendimiento */}
            <div className="p-6 border-b border-gray-200">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <span className="text-red-600 font-medium">Emprendimiento a rechazar:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Nombre:</span>
                    <p className="text-gray-900">{selectedEmprendimiento.commercialName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Representante:</span>
                    <p className="text-gray-900">{selectedEmprendimiento.representativeName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{selectedEmprendimiento.email}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">RUC/Cédula:</span>
                    <p className="text-gray-900">{selectedEmprendimiento.cedulaOrRuc}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">ID Emprendimiento:</span>
                    <p className="text-gray-900 font-mono text-xs">#{selectedEmprendimiento.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de observación */}
            <div className="p-6">
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
                    placeholder="Ingrese las razones del rechazo, observaciones sobre la documentación, o mejoras requeridas para que el emprendimiento pueda corregir su solicitud..."
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
                      setSelectedEmprendimiento(null);
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
                      El emprendimiento recibirá una notificación con su observación y no podrá continuar con su solicitud hasta corregir los problemas indicados. 
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
                      Esta acción rechazará definitivamente el emprendimiento. Asegúrese de que la observación sea clara y constructiva.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalesComerciales;