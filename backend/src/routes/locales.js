import { Router } from 'express';
import { 
  getLocales, 
  getLocalById, 
  createLocal, 
  updateLocal, 
  deleteLocal,
  getEventosByLocal,
  getTiposEvento,
  addTipoEvento
} from '../services/database.js';

const router = Router();

// Obtener tipos de evento disponibles
router.get('/tipos-evento', (req, res) => {
  try {
    const tipos = getTiposEvento();
    res.json({ data: tipos });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipos de evento' });
  }
});

// Agregar nuevo tipo de evento
router.post('/tipos-evento', (req, res) => {
  try {
    const { tipo } = req.body;
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo es requerido' });
    }
    const tipos = addTipoEvento(tipo);
    res.json({ data: tipos, mensaje: 'Tipo agregado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar tipo' });
  }
});

// Listar locales
router.get('/', (req, res) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query;
    let locales = getLocales({ q });
    
    const total = locales.length;
    locales = locales.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({ data: locales, total });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener locales' });
  }
});

// Obtener local por ID con sus eventos
router.get('/:id', (req, res) => {
  try {
    const local = getLocalById(req.params.id);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    
    const eventos = getEventosByLocal(req.params.id);
    res.json({ data: { ...local, eventos } });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener local' });
  }
});

// Crear local
router.post('/', (req, res) => {
  try {
    const { nombre, domicilio } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }
    
    const local = createLocal(req.body);
    res.status(201).json({ data: local, mensaje: 'Local creado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear local' });
  }
});

// Actualizar local
router.put('/:id', (req, res) => {
  try {
    const local = updateLocal(req.params.id, req.body);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    res.json({ data: local, mensaje: 'Local actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar local' });
  }
});

// Eliminar local
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteLocal(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    res.json({ mensaje: 'Local eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar local' });
  }
});

export default router;
