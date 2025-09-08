import React from 'react';
import { Phone, MessageCircle, Globe, Database, Users, Clock, Mail, MapPin } from 'lucide-react';
import '../styles/soporte.css';

const Soporte: React.FC = () => {
  const handleWhatsAppClick = (phone: string, name: string, area: string) => {
    const message = encodeURIComponent(
      `Hola ${name}, necesito soporte técnico para ${area}. Gracias.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const supportTeam = [
    {
      id: 1,
      name: "Ing. Verdesoto V. Ruben Ismael",
      area: "Aplicativo Web Municipal",
      phone: "0996344075",
      mail: "verdesotoruben@gmail.com",
      location: "Quito, Ecuador",
      description: "Especialista en sistemas web municipales y gestión de plataformas digitales",
      icon: Globe,
      color: "green"
    },
    {
      id: 2,
      name: "Ing. Marcela Calvache",
      area: "Aplicación Móvil",
      phone: "xxxxx",
      mail: "xxxxx",
      location: "xxxxx, Ecuador",
      description: "Experta en desarrollo y soporte de aplicaciones móviles municipales",
      icon: Phone,
      color: "purple"
    },
    {
      id: 3,
      name: "Ing. Moises Omar Loor Vásquez",
      area: "Desarrollador Backend.",
      phone: "0994601636",
      mail: "moisesloor122@gmail.com",
      location: "Santo Domingo, Ecuado",
      description: "Administrador de bases de datos",
      icon: Database,
      color: "blue"
    }
  ];

  return (
    <div className="soporte-container">
      <div className="soporte-header">
        <div className="soporte-title-section">
          <h1 className="soporte-title">Soporte Técnico</h1>
          <p className="soporte-subtitle">
            Asistencia especializada para sistemas municipales - GAD Municipal de Ibarra
          </p>
        </div>
        
        <div className="soporte-quote">
          <p>"Ibarra es la cuna de hombres libres y pensamiento ilustrado - Eloy Alfaro"</p>
        </div>
      </div>

      <div className="soporte-stats">
        <div className="stat-card">
          <Users className="stat-icon" />
          <div className="stat-content">
            <h3>3</h3>
            <p>Especialistas</p>
          </div>
        </div>
        <div className="stat-card">
          <Clock className="stat-icon" />
          <div className="stat-content">
            <h3>9/5</h3>
            <p>Disponibilidad</p>
          </div>
        </div>
        <div className="stat-card">
          <MessageCircle className="stat-icon" />
          <div className="stat-content">
            <h3>WhatsApp</h3>
            <p>Contacto Directo</p>
          </div>
        </div>
      </div>

      <div className="soporte-team-section">
        <h2 className="section-title">Nuestro Equipo de Soporte</h2>
        
        <div className="support-cards-grid">
          {supportTeam.map((member) => {
            const IconComponent = member.icon;
            return (
              <div key={member.id} className={`support-card ${member.color}`}>
                <div className="card-header">
                  <div className="card-icon-container">
                    <IconComponent className="card-icon" size={32} />
                  </div>
                  <div className="card-badge">
                    {member.area}
                  </div>
                </div>
                
                <div className="card-content">
                  <h3 className="card-title">{member.name}</h3>
                  <p className="card-description">{member.description}</p>
                  
                  <div className="card-contact-info">
                    <div className="contact-item">
                      <Phone size={16} />
                      <span>{member.phone}</span>
                    </div>
                    <div className="contact-item">
                      <Mail size={16} />
                      <span>{member.mail}</span>
                    </div>
                    <div className="contact-item">
                      <MapPin size={16} />
                      <span>{member.location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card-footer">
                  <button
                    onClick={() => handleWhatsAppClick(member.phone, member.name, member.area)}
                    className="whatsapp-button"
                    disabled={member.phone === "xxxxx"}
                  >
                    <MessageCircle size={20} />
                    <span>
                      {member.phone === "xxxxx" ? "Próximamente" : "Contactar por WhatsApp"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="soporte-info-section">
        <div className="info-card horarios-card">
          <h3>Horarios de Atención</h3>
          <div className="info-content horarios-content">
            <div className="horarios-text">
              <MessageCircle size={24} className="whatsapp-icon" />
              <p><strong>Contáctanos por WhatsApp</strong></p>
              <p>Lunes a Viernes de 9:00 AM a 6:00 PM</p>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>Tipos de Soporte</h3>
          <div className="info-content">
            <ul className="support-types">
              <li>🌐 Problemas con aplicativo web</li>
              <li>📱 Errores en aplicación móvil</li>
              <li>🗄️ Consultas de base de datos</li>
              <li>⚙️ Configuración de sistemas</li>
              <li>🔧 Mantenimiento preventivo</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="soporte-footer-note">
        <p>
          <strong>Nota:</strong> Para un servicio más eficiente, por favor especifique el tipo de problema 
          y el sistema afectado al contactar a nuestro equipo de soporte.
        </p>
      </div>
    </div>
  );
};

export default Soporte;