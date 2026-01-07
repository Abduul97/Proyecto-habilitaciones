import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { 
  getEventos, 
  getEventoById, 
  createEvento, 
  updateEvento, 
  deleteEvento,
  getEventosStats 
} from '../services/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '../../uploads');

// Crear carpeta uploads si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP'));
    }
  }
});

const router = Router();

router.get('/', (req, res) => {
  try {
    const { local, fecha, pagado, desde, hasta, limit = 50, offset = 0 } = req.query;
    let eventos = getEventos({ local, fecha, pagado, desde, hasta });
    
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

router.get('/comprobante/:filename', (req, res) => {
  const filePath = join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Archivo no encontrado' });
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

// Crear eventos (soporta múltiples eventos + múltiples comprobantes en Base64)
router.post('/', upload.array('comprobantes', 10), async (req, res) => {
  try {
    const { local, localId, domicilio, pagado, eventos: eventosJson } = req.body;
    
    if (!local) {
      return res.status(400).json({ error: 'Local es requerido' });
    }
    
    // Parsear eventos si viene como JSON string
    let eventosData = [];
    if (eventosJson) {
      try {
        eventosData = JSON.parse(eventosJson);
      } catch (e) {
        return res.status(400).json({ error: 'Formato de eventos inválido' });
      }
    }
    
    // Convertir archivos a Base64
    const comprobantesBase64 = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64 = fs.readFileSync(file.path).toString('base64');
        comprobantesBase64.push({
          nombre: file.originalname,
          tipo: file.mimetype,
          data: base64
        });
        // Eliminar archivo temporal
        fs.unlinkSync(file.path);
      }
    }
    
    const nuevosEventos = createEvento({
      local,
      localId,
      domicilio,
      pagado: pagado === 'true' || pagado === true,
      eventos: eventosData,
      comprobantesBase64
    });
    
    res.status(201).json({ data: nuevosEventos, mensaje: `${nuevosEventos.length} evento(s) creado(s)` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

// Obtener comprobante Base64
router.get('/comprobante-ver/:eventoId/:index', (req, res) => {
  try {
    const evento = getEventoById(req.params.eventoId);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    const index = parseInt(req.params.index);
    const comp = evento.comprobantesBase64?.[index];
    
    if (!comp) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }
    
    const buffer = Buffer.from(comp.data, 'base64');
    res.setHeader('Content-Type', comp.tipo);
    res.setHeader('Content-Disposition', `inline; filename="${comp.nombre}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comprobante' });
  }
});

router.put('/:id', upload.array('comprobantes', 10), (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.pagado !== undefined) {
      updateData.pagado = req.body.pagado === 'true' || req.body.pagado === true;
    }
    if (req.files && req.files.length > 0) {
      updateData.comprobantes = req.files.map(f => f.filename);
    }
    
    const evento = updateEvento(req.params.id, updateData);
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
