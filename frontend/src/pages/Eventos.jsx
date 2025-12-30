import { useState, useEffect } from 'react'
import { api } from '../services/api'

const emptyForm = {
  local: '',
  domicilio: '',
  evento: '',
  fecha: '',
  hora: '',
  comprobante: ''
}

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    loadEventos()
  }, [])

  async function loadEventos(local = '') {
    setLoading(true)
    try {
      const data = await api.getEventos(local ? { local } : {})
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
      comprobante: evento.comprobante || ''
    })
    setEditingId(evento.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingId) {
        await api.updateEvento(editingId, form)
        showMensaje('Evento actualizado')
      } else {
        await api.createEvento(form)
        showMensaje('Evento creado')
      }
      setShowForm(false)
      setForm(emptyForm)
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

  return (
    <div>
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Eventos Autorizados</h1>
            <p className="page-subtitle">Registro de eventos por fin de semana ({total} total)</p>
          </div>
          <button className="btn btn-primary" onClick={openNewForm}>+ Nuevo Evento</button>
        </div>
      </header>

      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'error' ? 'alert-error' : 'alert-success'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSearch} className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Buscar</button>
      </form>

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
                <th>Domicilio</th>
                <th>Evento</th>
                <th>Hora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{evento.fecha || '-'}</td>
                  <td><strong>{evento.local}</strong></td>
                  <td>{evento.domicilio}</td>
                  <td><span className="badge badge-warning">{evento.evento}</span></td>
                  <td>{evento.hora}</td>
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
