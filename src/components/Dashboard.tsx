import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Home from './Home';
import Requerimientos from './Requerimientos';
import Mensajeria from './Mensajeria';
import Proyectos from './Proyectos'; // Mantener el componente original
import Ferias from './Ferias';
import LocalesComerciales from './LocalesComerciales';
import '../styles/dashboard.css'

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <Home />;
      case 'requerimientos':
        return <Requerimientos />;
      case 'mensajeria':
        return <Mensajeria />;
      case 'comerciantes': // Cambiado de 'proyectos' a 'comerciantes'
        return <Proyectos />; // Mantener el componente original
      case 'ferias':
        return <Ferias />;
      case 'locales':
        return <LocalesComerciales />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="layout-container layout-background">
      <div className="layout-overlay"></div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={onLogout}
      />

      <div className="layout-content">
        <header className="layout-header">
          <div className="layout-header-container">
            <div className="layout-brand">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Escudo_de_Ibarra_%28Ecuador%29.png/250px-Escudo_de_Ibarra_%28Ecuador%29.png"
                alt="Escudo GAD Ibarra"
                className="layout-logo"
              />
              <div className="layout-brand-text">
                <h1 className="layout-brand-title">GAD Ibarra</h1>
                <p className="layout-brand-subtitle">Municipalidad</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(true)}
              className="layout-menu-button"
            >
              <svg className="layout-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        <main className="layout-main">
          <div className="layout-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;