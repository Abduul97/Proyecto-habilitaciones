import { Router } from 'express';
import { processMessage } from '../services/chatService.js';

const router = Router();

router.post('/', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    
    if (message.length > 500) {
      return res.status(400).json({ error: 'Mensaje muy largo' });
    }
    
    const response = processMessage(message.trim());
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
});

export default router;
