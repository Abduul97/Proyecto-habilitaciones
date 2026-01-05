import { useState, useEffect } from 'react'
import { api } from '../services/api'

const emptyForm = {
  localId: '',
  localNombre: '',
  domicilio: '',
  evento: '',
  fecha: '',
  hora: '',
  comprobante: '',
  pagado: false
}

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
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [nuevoLocal, setNuevoLocal] = useState({ nombre: '', domicilio: '' })
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
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
    setForm({ ...emptyForm, fecha: new Date().toISOString().split('T')[0] })
    setPdfFile(null)
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(evento) {
    setForm({
      localId: evento.localId || '',
      localNombre: evento.local || '',
      domicilio: evento.domicilio || '',
      evento: evento.evento || '',
      fecha: evento.fecha || '',
      hora: evento.hora || '',
      comprobante: evento.comprobante || '',
      pagado: evento.pagado || false
    })
    setPdfFile(null)
    setEditingId(evento.id)
    setShowForm(true)
  }

  function handleLocalSelect(localId) {
    const local = locales.find(l => l.id === localId)
    if (local) {
      setForm({ 
        ...form, 
        localId: local.id,
        localNombre: local.nombre,
        domicilio: local.domicilio 
      })
    }
  }

  async function handleCreateLocal(e) {
    e.preventDefault()
    try {
      const response = await api.createLocal(nuevoLocal)
      setLocales([response.data, ...locales])
      setForm({
        ...form,
        localId: response.data.id,
        localNombre: response.data.nombre,
        domicilio: response.data.domicilio
      })
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
      setForm({ ...form, evento: nuevoTipo.trim() })
      setNuevoTipo('')
      showMensaje('Tipo agregado')
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('local', form.localNombre)
      formData.append('localId', form.localId)
      formData.append('domicilio', form.domicilio)
      formData.append('evento', form.evento)
      formData.append('fecha', form.fecha)
      formData.append('hora', form.hora)
      formData.append('comprobante', form.comprobante)
      formData.append('pagado', form.pagado)
      
      if (pdfFile) {
        formData.append('comprobantePDF', pdfFile)
      }
      
      if (editingId) {
        await api.updateEventoWithFile(editingId, formData)
        showMensaje('Evento actualizado')
      } else {
        await api.createEventoWithFile(formData)
        showMensaje('Evento creado')
      }
      setShowForm(false)
      setForm(emptyForm)
      setPdfFile(null)
      setEditingId(null)
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
      hasta = hoy.toISOString().split('T')[0]
    } else if (tipo === 'mes') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
      hasta = hoy.toISOString().split('T')[0]
    } else if (tipo === 'año') {
      desde = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]
      hasta = hoy.toISOString().split('T')[0]
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

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Local *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="search-input"
                    style={{ flex: 1 }}
                    value={form.localId}
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
                {form.domicilio && <small style={{ color: 'var(--text-muted)' }}>📍 {form.domicilio}</small>}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de Evento *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      className="search-input"
                      style={{ flex: 1 }}
                      value={form.evento}
                      onChange={(e) => setForm({ ...form, evento: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar tipo...</option>
                      {tiposEvento.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Agregar nuevo tipo..."
                      value={nuevoTipo}
                      onChange={(e) => setNuevoTipo(e.target.value)}
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTipo}>+</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora</label>
                  <input
                    type="text"
                    placeholder="Ej: Hasta 03:30"
                    value={form.hora}
                    onChange={(e) => setForm({ ...form, hora: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Nº Comprobante</label>
                  <input
                    type="text"
                    value={form.comprobante}
                    onChange={(e) => setForm({ ...form, comprobante: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Comprobante (PDF o Imagen)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                  />
                  {pdfFile && <small>📎 {pdfFile.name}</small>}
                </div>
                <div className="form-group">
                  <label>Estado de pago</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={form.pagado}
                      onChange={(e) => setForm({ ...form, pagado: e.target.checked })}
                    />
                    Pagado
                  </label>
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
                <th>Hora</th>
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
                  <td>{evento.hora}</td>
                  <td>
                    <span className={`badge ${evento.pagado ? 'badge-success' : 'badge-danger'}`}>
                      {evento.pagado ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    {evento.comprobantePDF ? (
                      <a href={`/api/eventos/comprobante/${evento.comprobantePDF}`} target="_blank" rel="noopener noreferrer">
                        📎
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditForm(evento)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(evento.id, evento.local)}
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
