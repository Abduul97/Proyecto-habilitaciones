import { Router } from 'express';
import { 
  getHabilitados, 
  getHabilitadoById, 
  createHabilitado, 
  updateHabilitado, 
  deleteHabilitado,
  getHabilitadosStats 
} from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { q, categoria, estado, limit = 50, offset = 0 } = req.query;
    let habilitados = getHabilitados({ q, categoria, estado });
    
    const total = habilitados.length;
    habilitados = habilitados.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({ data: habilitados, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener habilitados' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = getHabilitadosStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/vencidos', (req, res) => {
  try {
    const vencidos = getHabilitados({ estado: 'vencido' });
    res.json({ 
      data: vencidos, 
      total: vencidos.length,
      mensaje: `${vencidos.length} establecimientos con documentación vencida`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vencidos' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const hab = getHabilitadoById(parseInt(req.params.id));
    if (!hab) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }
    res.json({ data: hab });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener establecimiento' });
  }
});

router.post('/', (req, res) => {
  try {
    const { nombre, domicilio, categoria } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }
    
    const hab = createHabilitado(req.body);
    res.status(201).json({ data: hab, mensaje: 'Establecimiento creado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear establecimiento' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const hab = updateHabilitado(parseInt(req.params.id), req.body);
    if (!hab) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }
    res.json({ data: hab, mensaje: 'Establecimiento actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar establecimiento' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteHabilitado(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }
    res.json({ mensaje: 'Establecimiento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar establecimiento' });
  }
});

export default router;
