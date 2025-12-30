import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          🏛️ Habilitaciones
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/habilitados" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            🏢 Establecimientos
          </NavLink>
          <NavLink to="/eventos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            🎉 Eventos
          </NavLink>
          <NavLink to="/rubros" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            📋 Rubros
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            💬 Asistente
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
