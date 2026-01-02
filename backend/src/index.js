import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './services/database.js';
import eventosRoutes from './routes/eventos.js';
import rubrosRoutes from './routes/rubros.js';
import habilitadosRoutes from './routes/habilitados.js';
import chatRoutes from './routes/chat.js';
import reportesRoutes from './routes/reportes.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize database from Excel files
initDatabase();

// Security
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false
}));
app.use(cors({ 
  origin: isProduction ? true : (process.env.CORS_ORIGIN || 'http://localhost:5173')
}));
app.use(express.json());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes, intente más tarde' }
}));

// API Routes
app.use('/api/eventos', eventosRoutes);
app.use('/api/rubros', rubrosRoutes);
app.use('/api/habilitados', habilitadosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reportes', reportesRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve frontend in production
if (isProduction) {
  const frontendPath = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
