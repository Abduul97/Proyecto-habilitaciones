import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Rubros() {
  const [rubros, setRubros] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadRubros()
  }, [])

  async function loadRubros(q = '') {
    setLoading(true)
    try {
      const data = await api.getRubros(q ? { q } : {})
      setRubros(data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    loadRubros(search)
  }

  async function viewDetails(codigo) {
    try {
      const data = await api.getRubro(codigo)
      setSelected(data.data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Rubros y Requisitos</h1>
        <p className="page-subtitle">Catálogo de actividades de bajo riesgo</p>
      </header>

      <form onSubmit={handleSearch} className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por código o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Buscar</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        <div className="card">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : rubros.length === 0 ? (
            <div className="empty-state">No se encontraron rubros</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Rubro</th>
                  <th>Requisitos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rubros.slice(0, 20).map((rubro) => (
                  <tr key={rubro.codigo}>
                    <td><strong>{rubro.codigo}</strong></td>
                    <td>{rubro.nombre}</td>
                    <td>
                      <span className="badge badge-success">{rubro.requisitos || 'General'}</span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => viewDetails(rubro.codigo)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <h3>{selected.nombre}</h3>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.5rem' }}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <p><strong>Código:</strong> {selected.codigo}</p>
            <p><strong>Tipo:</strong> {selected.tipoLocal}</p>
            <p><strong>Requisitos:</strong> {selected.requisitos}</p>
            
            {selected.requisitosDetalle?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Detalle de requisitos:</h4>
                <ul style={{ paddingLeft: '1.5rem' }}>
                  {selected.requisitosDetalle.map((req, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
