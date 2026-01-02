import { useState, useEffect } from 'react'
import { api } from '../services/api'

const emptyForm = {
  local: '',
  domicilio: '',
  evento: '',
  fecha: '',
  hora: '',
  comprobante: '',
  pagado: false
}

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [search, setSearch] = useState('')
  const [filtroPagado, setFiltroPagado] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    loadEventos()
  }, [filtroPagado, filtroDesde, filtroHasta])

  async function loadEventos(local = '') {
    setLoading(true)
    try {
      const params = {}
      if (local) params.local = local
      if (filtroPagado !== '') params.pagado = filtroPagado
      if (filtroDesde) params.desde = filtroDesde
      if (filtroHasta) params.hasta = filtroHasta
      
      const data = await api.getEventos(params)
      setEventos(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error:', error)
      showMensaje('Error al cargar eventos', 'error')
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
    loadEventos(search)
  }

  function openNewForm() {
    setForm({ ...emptyForm, fecha: new Date().toISOString().split('T')[0] })
    setPdfFile(null)
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(evento) {
    setForm({
      local: evento.local || '',
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

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const formData = new FormData()
      Object.keys(form).forEach(key => {
        formData.append(key, form[key])
      })
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
      loadEventos()
    } catch (error) {
      showMensaje(error.message, 'error')
    }
  }

  async function handleDelete(id, local) {
    if (!confirm(`¿Eliminar evento de "${local}"?`)) return
    try {
      await api.deleteEvento(id)
      showMensaje('Evento eliminado')
      loadEventos()
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
            <p className="page-subtitle">Registro de eventos ({total} total)</p>
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
          <button className="btn btn-secondary btn-sm" onClick={() => { setFiltroDesde(''); setFiltroHasta(''); setFiltroPagado(''); }}>Limpiar</button>
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
            placeholder="Desde"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
          />
          <input 
            type="date" 
            className="search-input"
            style={{ flex: 1, minWidth: '150px' }}
            placeholder="Hasta"
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
              <div className="form-grid">
                <div className="form-group">
                  <label>Local *</label>
                  <input
                    type="text"
                    required
                    value={form.local}
                    onChange={(e) => setForm({ ...form, local: e.target.value })}
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
                  <label>Evento</label>
                  <input
                    type="text"
                    value={form.evento}
                    placeholder="Ej: Apertura, Fiesta, Karaoke"
                    onChange={(e) => setForm({ ...form, evento: e.target.value })}
                  />
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
                  <label>Comprobante PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                  />
                  {pdfFile && <small>Archivo: {pdfFile.name}</small>}
                </div>
                <div className="form-group">
                  <label>Estado de pago</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
                <th>Evento</th>
                <th>Hora</th>
                <th>Pagado</th>
                <th>PDF</th>
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
                        📄 Ver
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
