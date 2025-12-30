import { Router } from 'express';
import { 
  getEventos, 
  getEventoById, 
  createEvento, 
  updateEvento, 
  deleteEvento,
  getEventosStats 
} from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { local, fecha, limit = 50, offset = 0 } = req.query;
    let eventos = getEventos({ local, fecha });
    
    const total = eventos.length;
    eventos = eventos.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({ data: eventos, total, limit: Number(limit), offset: Number(offset) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = getEventosStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const evento = getEventoById(req.params.id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json({ data: evento });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener evento' });
  }
});

router.post('/', (req, res) => {
  try {
    const { local, domicilio, evento, fecha, hora } = req.body;
    
    if (!local) {
      return res.status(400).json({ error: 'Local es requerido' });
    }
    
    const nuevoEvento = createEvento(req.body);
    res.status(201).json({ data: nuevoEvento, mensaje: 'Evento creado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const evento = updateEvento(req.params.id, req.body);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json({ data: evento, mensaje: 'Evento actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteEvento(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json({ mensaje: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

export default router;
