import React, { useState, useEffect } from 'react';
import { Shield, Users, TrendingUp, MapPin, Calendar, Award, Store, FileText, MessageSquare } from 'lucide-react';
import '../styles/home.css';

const Home: React.FC = () => {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  const quotes = [
    "Ibarra es el alma de la Sierra Norte; su historia es ejemplo de resurgimiento - Benjamín Carrión",
    "El terremoto de 1868 destruyó la ciudad, pero no el espíritu ibarreño. Esa ciudad se reconstruyó con el corazón de su pueblo - Pedro Moncayo",
    "Ibarra es la cuna de hombres libres y pensamiento ilustrado - Eloy Alfaro",
    "Entre Yahuarcocha y el Imbabura se respira historia. Ibarra no olvida su origen ni su destino - Luis Felipe Borja",
    "El blanco de Ibarra no es solo su cal, es la limpieza de su cultura - Jorge Icaza",
    "Ibarra vive en mi memoria como el lugar donde el cielo toca la tierra - Oswaldo Guayasamín",
    "Si Ecuador tiene un norte con dignidad, ese es Ibarra - Alfonso Moreno Mora",
    "En la Ciudad Blanca cada piedra habla; basta escuchar con respeto - Luis Alberto Costales",
    "De las cenizas nació la nueva Ibarra, como el ave fénix de los Andes - Manuel Jijón Larrea",
    "Ibarra no necesita testigos, su belleza habla por sí sola - Julio Pazos Barrera"

  ];

  const stats = [
    { icon: Store, label: 'Locales Comerciales', value: '1,247', color: 'bg-blue-500' },
    { icon: Users, label: 'Emprendimientos', value: '892', color: 'bg-green-500' },
    { icon: Calendar, label: 'Ferias Activas', value: '15', color: 'bg-purple-500' },
    { icon: Award, label: 'Proyectos Aprobados', value: '234', color: 'bg-orange-500' }
  ];

  useEffect(() => {
    setMounted(true);
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(quoteInterval);
      clearInterval(timeInterval);
    };
  }, [quotes.length]);

  return (
    <div className="home-container">
      <div className="home-bg-overlay"></div>
      <div className="home-content">
        {/* Header */}
        <div className="home-header">
          <div className="home-header-content">
            <div>
              <h1 className="home-title">Bienvenido al Sistema Municipal</h1>
              <p className="home-subtitle">
                Gestión de Locales Comerciales, Emprendimientos y Ferias - GAD Municipal de Ibarra
              </p>
            </div>
            <div className="home-date">
              <p>
                {currentTime.toLocaleDateString('es-EC', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="home-time">
                {currentTime.toLocaleTimeString('es-EC', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Logo y escudo */}
        <div className="home-logo-card">
          <div className="home-logo-top-border"></div>
          <div className="home-logo-content">
            <div className="home-logo-text">
              <div className="home-logo-circle">
                <div className="home-logo-gradient"></div>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Escudo_de_Ibarra_%28Ecuador%29.png/250px-Escudo_de_Ibarra_%28Ecuador%29.png"
                  alt="Escudo GAD Ibarra"
                  className="home-logo-img"
                />
              </div>
              <h2 className="home-logo-title">GAD Municipal de Ibarra</h2>
              <p className="home-logo-subtitle">Gobierno Autónomo Descentralizado</p>
            </div>

            <div>
              <div className="home-location">
                <MapPin className="home-location-icon" />
                <span className="home-location-text">Ibarra, Ecuador</span>
              </div>
              <div className="home-quote-container">
                <p className={`home-quote ${mounted ? 'home-quote-enter-active' : 'home-quote-enter'}`}>
                  "{quotes[currentQuote]}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="home-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="home-stat-card">
              <div className="home-stat-hover-bg"></div>
              <div className="home-stat-header">
                <div className={`home-stat-icon-container ${stat.color}`}>
                  <stat.icon className="home-stat-icon" />
                </div>
                <span className="home-stat-value">{stat.value}</span>
              </div>
              <p className="home-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Secciones principales */}
        <div className="home-main-grid">
          {/* Novedades */}
          <div className="home-section-card">
            <h3 className="home-section-title">
              <TrendingUp className="home-section-icon" />
              Novedades Recientes
            </h3>
            <div>
              <div className="home-news-item home-news-item-red">
                <h4 className="home-news-title">Nueva Feria de Emprendimientos</h4>
                <p className="home-news-text">Apertura de inscripciones para la feria mensual</p>
                <span className="home-news-time">Hace 2 horas</span>
              </div>
              <div className="home-news-item home-news-item-blue">
                <h4 className="home-news-title">Actualización de Requisitos</h4>
                <p className="home-news-text">Nuevos lineamientos para locales comerciales</p>
                <span className="home-news-time">Hace 1 día</span>
              </div>
              <div className="home-news-item home-news-item-green">
                <h4 className="home-news-title">Proyecto Aprobado</h4>
                <p className="home-news-text">Centro comercial en zona norte</p>
                <span className="home-news-time">Hace 3 días</span>
              </div>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="home-section-card">
            <h3 className="home-section-title">
              <Users className="home-section-icon" />
              Accesos Rápidos
            </h3>
            <div className="home-quicklinks-grid">
              <button className="home-quicklink">
                <div className="home-quicklink-content">
                  <div className="home-quicklink-icon-container">
                    <FileText className="home-quicklink-icon" />
                  </div>
                  <span className="home-quicklink-label">Nuevo Requisito</span>
                </div>
              </button>
              <button className="home-quicklink home-quicklink-blue">
                <div className="home-quicklink-content">
                  <div className="home-quicklink-icon-container">
                    <MessageSquare className="home-quicklink-icon" />
                  </div>
                  <span className="home-quicklink-label">Mensajes</span>
                </div>
              </button>
              <button className="home-quicklink home-quicklink-green">
                <div className="home-quicklink-content">
                  <div className="home-quicklink-icon-container">
                    <Calendar className="home-quicklink-icon" />
                  </div>
                  <span className="home-quicklink-label">Nueva Feria</span>
                </div>
              </button>
              <button className="home-quicklink home-quicklink-purple">
                <div className="home-quicklink-content">
                  <div className="home-quicklink-icon-container">
                    <Store className="home-quicklink-icon" />
                  </div>
                  <span className="home-quicklink-label">Registro Local</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;