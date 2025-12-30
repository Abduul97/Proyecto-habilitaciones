import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="layout">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            🏛️ Habilitaciones
          </div>
          <button className="menu-close" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/habilitados" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            🏢 Establecimientos
          </NavLink>
          <NavLink to="/eventos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            🎉 Eventos
          </NavLink>
          <NavLink to="/rubros" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            📋 Rubros
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            💬 Asistente
          </NavLink>
        </nav>
      </aside>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
      <main className="main-content">
        <header className="mobile-header">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)}>☰</button>
          <span className="mobile-title">🏛️ Habilitaciones</span>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
