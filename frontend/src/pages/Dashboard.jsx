import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Dashboard() {
  const [eventosStats, setEventosStats] = useState(null)
  const [rubrosCount, setRubrosCount] = useState(0)
  const [habilitadosStats, setHabilitadosStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [eventos, rubros, habilitados] = await Promise.all([
          api.getEventosStats(),
          api.getRubros(),
          api.getHabilitadosStats()
        ])
        setEventosStats(eventos)
        setRubrosCount(rubros.total || 0)
        setHabilitadosStats(habilitados)
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen del sistema de habilitaciones</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{eventosStats?.total || 0}</div>
          <div className="stat-label">Eventos Registrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{habilitadosStats?.total || 0}</div>
          <div className="stat-label">Establecimientos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rubrosCount}</div>
          <div className="stat-label">Rubros Disponibles</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {habilitadosStats?.porEstado?.vencido || 0}
          </div>
          <div className="stat-label">Doc. Vencida</div>
        </div>
      </div>

      {/* Alertas de vencimientos */}
      {habilitadosStats?.alertas?.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--warning)' }}>
            ⚠️ Alertas de Documentación ({habilitadosStats.totalAlertas})
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>Establecimiento</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Médica</th>
                <th>Seguro</th>
              </tr>
            </thead>
            <tbody>
              {habilitadosStats.alertas.slice(0, 10).map((alerta) => (
                <tr key={alerta.id}>
                  <td><strong>{alerta.nombre}</strong></td>
                  <td>{alerta.categoria}</td>
                  <td>
                    <span className={`badge ${alerta.estado === 'vencido' ? 'badge-danger' : 'badge-warning'}`}>
                      {alerta.estado === 'vencido' ? 'VENCIDO' : 'POR VENCER'}
                    </span>
                  </td>
                  <td style={{ color: alerta.diasMedica < 0 ? 'var(--danger)' : 'inherit' }}>
                    {alerta.diasMedica !== null ? `${alerta.diasMedica}d` : '-'}
                  </td>
                  <td style={{ color: alerta.diasSeguro < 0 ? 'var(--danger)' : 'inherit' }}>
                    {alerta.diasSeguro !== null ? `${alerta.diasSeguro}d` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Establecimientos por categoría */}
      {habilitadosStats?.porCategoria && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Establecimientos por Categoría</h3>
          <div className="stats-grid">
            {Object.entries(habilitadosStats.porCategoria).map(([cat, count]) => (
              <div key={cat} className="stat-card">
                <div className="stat-value">{count}</div>
                <div className="stat-label">{cat}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Locales con más eventos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Local</th>
            </tr>
          </thead>
          <tbody>
            {(eventosStats?.localesTop || []).map((local, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{local}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
