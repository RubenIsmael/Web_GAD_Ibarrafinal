import React from 'react';
import {
  Home,
  FileText,
  MessageSquare,
  FolderOpen,
  Calendar,
  Store,
  LogOut,
  X
} from 'lucide-react';
import '../styles/sidebar.css'

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSectionChange,
  onLogout
}) => {
  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
   // { id: 'requerimientos', label: 'Requerimientos', icon: FileText },
    { id: 'promociones', label: 'Promociones', icon: MessageSquare }, 
    { id: 'comerciantes', label: 'Comerciantes', icon: FolderOpen },
    //{ id: 'ferias', label: 'Ferias', icon: Calendar },
    { id: 'soporte', label: 'soporte técnico', icon: Calendar },
    { id: 'locales', label: 'Locales Comerciales', icon: Store },
  ];

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    onClose();
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-container ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-accent-bar"></div>
        <div className="sidebar-content">
          {/* Header */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="sidebar-logo-container">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpuHktR3HBUhWPGgwb1c-jfrpWXEfuGe5dOA&s"
                  alt="Escudo GAD Ibarra"
                  className="sidebar-logo"
                />
              </div>
              <div className="sidebar-brand-text">
                <h1 className="sidebar-brand-title">GAD Ibarra</h1>
                <p className="sidebar-brand-subtitle">Municipalidad</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="sidebar-close-button"
            >
              <X size={20} className="sidebar-menu-icon" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`sidebar-menu-button ${isActive
                      ? 'sidebar-menu-button-active'
                      : 'sidebar-menu-button-inactive'
                    }`}
                >
                  <Icon size={20} className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <button
              onClick={onLogout}
              className="sidebar-logout-button"
            >
              <LogOut size={20} className="sidebar-menu-icon" />
              <span className="sidebar-menu-label">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;