import { Router } from 'express';
import { getRubros, getRubroById, getRequisitos } from '../services/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { q, tipo } = req.query;
    const rubros = getRubros({ q, tipo });
    res.json({ data: rubros, total: rubros.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rubros' });
  }
});

router.get('/requisitos', (req, res) => {
  try {
    const requisitos = getRequisitos();
    res.json({ data: requisitos });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener requisitos' });
  }
});

router.get('/:codigo', (req, res) => {
  try {
    const rubro = getRubroById(req.params.codigo);
    if (!rubro) {
      return res.status(404).json({ error: 'Rubro no encontrado' });
    }
    res.json({ data: rubro });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rubro' });
  }
});

export default router;
