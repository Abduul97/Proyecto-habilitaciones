import { useState, useEffect } from 'react'
import { api } from '../services/api'

const CATEGORIAS = ['BAR-PUB', 'BOLICHE', 'SALON DE FIESTAS', 'CLUB-CENTRO VECINAL']

const emptyForm = {
  nombre: '',
  domicilio: '',
  categoria: 'BAR-PUB',
  coberturaMedicaEmpresa: '',
  coberturaMedicaVenc: '',
  seguroEmpresa: '',
  seguroVenc: '',
  capacidad: '',
  telefono: ''
}

export default function Habilitados() {
  const [habilitados, setHabilitados] = useState([])
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    loadData()
  }, [filtroCategoria, filtroEstado])

  async function loadData() {
    setLoading(true)
    try {
      const params = {}
      if (filtroCategoria) params.categoria = filtroCategoria
      if (filtroEstado) params.estado = filtroEstado
      const data = await api.getHabilitados(params)
      setHabilitados(data.data || [])
    } catch (error) {
      console.error('Error:', error)
      showMensaje('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  function showMensaje(texto, tipo = 'success') {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.getHabilitados({ q: search })
      setHabilitados(data.data || [])
    } catch (error) {
      showMensaje('Error en búsqueda', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openNewForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(hab) {
    setForm({
      nombre: hab.nombre || '',
      domicilio: hab.domicilio || '',
      categoria: hab.categoria || 'BAR-PUB',
      coberturaMedicaEmpresa: hab.coberturaMedica?.empresa || '',
      coberturaMedicaVenc: hab.coberturaMedica?.vencimiento || '',
      seguroEmpresa: hab.seguroRespCivil?.empresa || '',
      seguroVenc: hab.seguroRespCivil?.vencimiento || '',
      capacidad: hab.capacidad || '',
      telefono: hab.telefono || ''
    })
    setEditingId(hab.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateHabilitado(editingId, form)
        showMensaje('Establecimiento actualizado')
      } else {
        await api.createHabilitado(form)
        showMensaje('Establecimiento creado')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      loadData()
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  async function handleDelete(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    try {
      await api.deleteHabilitado(id)
      showMensaje('Establecimiento eliminado')
      loadData()
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  function getEstadoBadge(estado) {
    const clases = {
      vigente: 'badge-success',
      por_vencer: 'badge-warning',
      vencido: 'badge-danger',
      sin_datos: ''
    }
    const textos = {
      vigente: 'Vigente',
      por_vencer: 'Por vencer',
      vencido: 'Vencido',
      sin_datos: 'Sin datos'
    }
    return <span className={`badge ${clases[estado] || ''}`}>{textos[estado] || estado}</span>
  }

  return (
    <div>
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Establecimientos Habilitados</h1>
            <p className="page-subtitle">Gestión de espectáculos y locales</p>
          </div>
          <button className="btn btn-primary" onClick={openNewForm}>+ Nuevo</button>
        </div>
      </header>

      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'error' ? 'alert-error' : 'alert-success'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <form onSubmit={handleSearch} className="search-box" style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Buscar</button>
        </form>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            className="search-input" 
            style={{ flex: 1 }}
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="search-input" 
            style={{ flex: 1 }}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="por_vencer">Por vencer</option>
            <option value="vencido">Vencido</option>
            <option value="sin_datos">Sin datos</option>
          </select>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Domicilio</label>
                  <input
                    type="text"
                    value={form.domicilio}
                    onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Capacidad</label>
                  <input
                    type="text"
                    value={form.capacidad}
                    onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
                  />
                </div>
              </div>
              
              <h4 style={{ margin: '1rem 0 0.5rem' }}>Cobertura Médica</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Empresa</label>
                  <input
                    type="text"
                    value={form.coberturaMedicaEmpresa}
                    onChange={(e) => setForm({ ...form, coberturaMedicaEmpresa: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Vencimiento</label>
                  <input
                    type="date"
                    value={form.coberturaMedicaVenc}
                    onChange={(e) => setForm({ ...form, coberturaMedicaVenc: e.target.value })}
                  />
                </div>
              </div>

              <h4 style={{ margin: '1rem 0 0.5rem' }}>Seguro Resp. Civil</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Empresa</label>
                  <input
                    type="text"
                    value={form.seguroEmpresa}
                    onChange={(e) => setForm({ ...form, seguroEmpresa: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Vencimiento</label>
                  <input
                    type="date"
                    value={form.seguroVenc}
                    onChange={(e) => setForm({ ...form, seguroVenc: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : habilitados.length === 0 ? (
          <div className="empty-state">No se encontraron establecimientos</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Domicilio</th>
                <th>Categoría</th>
                <th>Médica</th>
                <th>Seguro</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {habilitados.map((hab) => (
                <tr key={hab.id}>
                  <td><strong>{hab.nombre}</strong></td>
                  <td>{hab.domicilio}</td>
                  <td><span className="badge">{hab.categoria}</span></td>
                  <td>
                    <small>
                      {hab.coberturaMedica?.empresa || '-'}<br/>
                      <span style={{ color: hab.coberturaMedica?.diasRestantes < 0 ? 'var(--danger)' : 'inherit' }}>
                        {hab.coberturaMedica?.diasRestantes !== null ? `${hab.coberturaMedica.diasRestantes}d` : ''}
                      </span>
                    </small>
                  </td>
                  <td>
                    <small>
                      {hab.seguroRespCivil?.empresa || '-'}<br/>
                      <span style={{ color: hab.seguroRespCivil?.diasRestantes < 0 ? 'var(--danger)' : 'inherit' }}>
                        {hab.seguroRespCivil?.diasRestantes !== null ? `${hab.seguroRespCivil.diasRestantes}d` : ''}
                      </span>
                    </small>
                  </td>
                  <td>{getEstadoBadge(hab.estadoGeneral)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditForm(hab)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(hab.id, hab.nombre)}
                        style={{ color: 'var(--danger)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
