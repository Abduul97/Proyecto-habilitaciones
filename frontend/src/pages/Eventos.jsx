import { useState, useEffect } from 'react'
import { api } from '../services/api'

const emptyEvento = { tipo: '', fecha: '', horaDesde: '', horaHasta: '' }

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [locales, setLocales] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [search, setSearch] = useState('')
  const [filtroPagado, setFiltroPagado] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showLocalForm, setShowLocalForm] = useState(false)
  
  // Form state
  const [selectedLocalId, setSelectedLocalId] = useState('')
  const [selectedLocal, setSelectedLocal] = useState(null)
  const [eventosForm, setEventosForm] = useState([{ ...emptyEvento }])
  const [comprobantes, setComprobantes] = useState([])
  const [pagado, setPagado] = useState(false)
  const [nuevoLocal, setNuevoLocal] = useState({ nombre: '', domicilio: '' })
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    loadData()
  }, [filtroPagado, filtroDesde, filtroHasta])

  async function loadData() {
    setLoading(true)
    try {
      const params = {}
      if (filtroPagado !== '') params.pagado = filtroPagado
      if (filtroDesde) params.desde = filtroDesde
      if (filtroHasta) params.hasta = filtroHasta
      
      const [eventosData, localesData, tiposData] = await Promise.all([
        api.getEventos(params),
        api.getLocales(),
        api.getTiposEvento()
      ])
      
      setEventos(eventosData.data || [])
      setTotal(eventosData.total || 0)
      setLocales(localesData.data || [])
      setTiposEvento(tiposData.data || [])
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
      const data = await api.getEventos({ local: search })
      setEventos(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      showMensaje('Error en búsqueda', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openNewForm() {
    setSelectedLocalId('')
    setSelectedLocal(null)
    setEventosForm([{ ...emptyEvento }])
    setComprobantes([])
    setPagado(false)
    setShowForm(true)
  }

  function handleLocalSelect(localId) {
    const local = locales.find(l => l.id === localId)
    setSelectedLocalId(localId)
    setSelectedLocal(local)
  }

  function addEvento() {
    setEventosForm([...eventosForm, { ...emptyEvento }])
  }

  function removeEvento(index) {
    if (eventosForm.length > 1) {
      setEventosForm(eventosForm.filter((_, i) => i !== index))
    }
  }

  function updateEvento(index, field, value) {
    const updated = [...eventosForm]
    updated[index] = { ...updated[index], [field]: value }
    setEventosForm(updated)
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files)
    setComprobantes([...comprobantes, ...files])
  }

  function removeComprobante(index) {
    setComprobantes(comprobantes.filter((_, i) => i !== index))
  }

  async function handleCreateLocal(e) {
    e.preventDefault()
    try {
      const response = await api.createLocal(nuevoLocal)
      setLocales([response.data, ...locales])
      setSelectedLocalId(response.data.id)
      setSelectedLocal(response.data)
      setNuevoLocal({ nombre: '', domicilio: '' })
      setShowLocalForm(false)
      showMensaje('Local creado')
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  async function handleAddTipo() {
    if (!nuevoTipo.trim()) return
    try {
      const response = await api.addTipoEvento(nuevoTipo.trim())
      setTiposEvento(response.data)
      setNuevoTipo('')
      showMensaje('Tipo agregado')
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!selectedLocal) {
      showMensaje('Selecciona un local', 'error')
      return
    }
    
    const eventosValidos = eventosForm.filter(ev => ev.tipo)
    if (eventosValidos.length === 0) {
      showMensaje('Agrega al menos un evento', 'error')
      return
    }
    
    try {
      const formData = new FormData()
      formData.append('local', selectedLocal.nombre)
      formData.append('localId', selectedLocal.id)
      formData.append('domicilio', selectedLocal.domicilio || '')
      formData.append('pagado', pagado)
      formData.append('eventos', JSON.stringify(eventosValidos))
      
      comprobantes.forEach(file => {
        formData.append('comprobantes', file)
      })
      
      await api.createEventoWithFile(formData)
      showMensaje(`${eventosValidos.length} evento(s) creado(s)`)
      setShowForm(false)
      loadData()
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  async function handleDelete(id, local) {
    if (!confirm(`¿Eliminar evento de "${local}"?`)) return
    try {
      await api.deleteEvento(id)
      showMensaje('Evento eliminado')
      loadData()
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  function exportarPDF() {
    const params = new URLSearchParams()
    if (filtroPagado !== '') params.append('pagado', filtroPagado)
    if (filtroDesde) params.append('desde', filtroDesde)
    if (filtroHasta) params.append('hasta', filtroHasta)
    window.open(`/api/reportes/eventos/pdf?${params.toString()}`, '_blank')
  }

  function exportarExcel() {
    const params = new URLSearchParams()
    if (filtroPagado !== '') params.append('pagado', filtroPagado)
    if (filtroDesde) params.append('desde', filtroDesde)
    if (filtroHasta) params.append('hasta', filtroHasta)
    window.open(`/api/reportes/eventos/excel?${params.toString()}`, '_blank')
  }

  function setFiltroRapido(tipo) {
    const hoy = new Date()
    let desde, hasta
    
    if (tipo === 'semana') {
      const inicioSemana = new Date(hoy)
      inicioSemana.setDate(hoy.getDate() - hoy.getDay())
      desde = inicioSemana.toISOString().split('T')[0]
      hasta = new Date(inicioSemana.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else if (tipo === 'mes') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
    } else if (tipo === 'año') {
      desde = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]
      hasta = new Date(hoy.getFullYear(), 11, 31).toISOString().split('T')[0]
    }
    
    setFiltroDesde(desde)
    setFiltroHasta(hasta)
  }

  return (
    <div>
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Eventos Autorizados</h1>
            <p className="page-subtitle">{total} eventos | {locales.length} locales</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={exportarPDF}>📄 PDF</button>
            <button className="btn btn-secondary" onClick={exportarExcel}>📊 Excel</button>
            <button className="btn btn-primary" onClick={openNewForm}>+ Nuevo</button>
          </div>
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
            placeholder="Buscar por local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Buscar</button>
        </form>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setFiltroRapido('semana')}>Esta semana</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setFiltroRapido('mes')}>Este mes</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setFiltroRapido('año')}>Este año</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setFiltroDesde(''); setFiltroHasta(''); setFiltroPagado(''); loadData(); }}>Limpiar</button>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            className="search-input" 
            style={{ flex: 1, minWidth: '150px' }}
            value={filtroPagado}
            onChange={(e) => setFiltroPagado(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Pagados</option>
            <option value="false">No pagados</option>
          </select>
          <input 
            type="date" 
            className="search-input"
            style={{ flex: 1, minWidth: '150px' }}
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
          />
          <input 
            type="date" 
            className="search-input"
            style={{ flex: 1, minWidth: '150px' }}
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
          />
        </div>
      </div>

      {/* Modal Form - Nuevo diseño multi-evento */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>Nuevo Registro de Eventos</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Selección de Local */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label><strong>Local *</strong></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="search-input"
                    style={{ flex: 1 }}
                    value={selectedLocalId}
                    onChange={(e) => handleLocalSelect(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar local...</option>
                    {locales.map(l => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLocalForm(true)}>
                    + Nuevo
                  </button>
                </div>
                {selectedLocal && (
                  <small style={{ color: 'var(--text-muted)' }}>📍 {selectedLocal.domicilio || 'Sin domicilio'}</small>
                )}
              </div>

              {/* Eventos */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label><strong>Eventos</strong></label>
                {eventosForm.map((ev, idx) => (
                  <div key={idx} style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius)', 
                    padding: '1rem', 
                    marginBottom: '0.5rem',
                    background: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '500' }}>Evento {idx + 1}</span>
                      {eventosForm.length > 1 && (
                        <button type="button" onClick={() => removeEvento(idx)} style={{ 
                          background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' 
                        }}>🗑️</button>
                      )}
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Tipo *</label>
                        <select
                          className="search-input"
                          value={ev.tipo}
                          onChange={(e) => updateEvento(idx, 'tipo', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar...</option>
                          {tiposEvento.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Fecha</label>
                        <input
                          type="date"
                          value={ev.fecha}
                          onChange={(e) => updateEvento(idx, 'fecha', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Hora Desde</label>
                        <input
                          type="time"
                          value={ev.horaDesde}
                          onChange={(e) => updateEvento(idx, 'horaDesde', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Hora Hasta</label>
                        <input
                          type="time"
                          value={ev.horaHasta}
                          onChange={(e) => updateEvento(idx, 'horaHasta', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addEvento} style={{ width: '100%' }}>
                  + Agregar otro evento
                </button>
                
                {/* Agregar nuevo tipo */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Agregar nuevo tipo de evento..."
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTipo}>+ Tipo</button>
                </div>
              </div>

              {/* Comprobantes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label><strong>Comprobantes (PDF o Imágenes)</strong></label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  style={{ marginBottom: '0.5rem' }}
                />
                {comprobantes.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {comprobantes.map((file, idx) => (
                      <span key={idx} style={{ 
                        background: '#e5e7eb', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        📎 {file.name}
                        <button type="button" onClick={() => removeComprobante(idx)} style={{ 
                          background: 'none', border: 'none', cursor: 'pointer', color: '#666' 
                        }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado de pago */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={pagado}
                    onChange={(e) => setPagado(e.target.checked)}
                  />
                  <strong>Pagado</strong>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Local */}
      {showLocalForm && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Nuevo Local</h3>
              <button className="btn-close" onClick={() => setShowLocalForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateLocal}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  required
                  value={nuevoLocal.nombre}
                  onChange={(e) => setNuevoLocal({ ...nuevoLocal, nombre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Domicilio</label>
                <input
                  type="text"
                  value={nuevoLocal.domicilio}
                  onChange={(e) => setNuevoLocal({ ...nuevoLocal, domicilio: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLocalForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de eventos */}
      <div className="card">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : eventos.length === 0 ? (
          <div className="empty-state">No se encontraron eventos</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Local</th>
                <th>Tipo</th>
                <th>Horario</th>
                <th>Pagado</th>
                <th>Comp.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{evento.fecha || '-'}</td>
                  <td><strong>{evento.local}</strong></td>
                  <td><span className="badge badge-warning">{evento.evento}</span></td>
                  <td>{evento.horaDesde && evento.horaHasta ? `${evento.horaDesde} - ${evento.horaHasta}` : (evento.hora || '-')}</td>
                  <td>
                    <span className={`badge ${evento.pagado ? 'badge-success' : 'badge-danger'}`}>
                      {evento.pagado ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    {evento.comprobantesBase64?.length > 0 ? (
                      evento.comprobantesBase64.map((c, i) => (
                        <a key={i} href={`/api/eventos/comprobante-ver/${evento.id}/${i}`} target="_blank" rel="noopener noreferrer" style={{ marginRight: '0.25rem' }}>
                          📎 {c.nombre?.substring(0, 10)}
                        </a>
                      ))
                    ) : evento.comprobantes?.length > 0 ? (
                      evento.comprobantes.map((c, i) => (
                        <a key={i} href={`/api/eventos/comprobante/${c}`} target="_blank" rel="noopener noreferrer" style={{ marginRight: '0.25rem' }}>
                          📎
                        </a>
                      ))
                    ) : '-'}
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(evento.id, evento.local)}
                      style={{ color: 'var(--danger)' }}
                    >
                      🗑️
                    </button>
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
