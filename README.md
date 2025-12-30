# Sistema de Habilitaciones Municipales

Sistema de gestión de habilitaciones comerciales para municipalidades.

## Demo

[URL del deploy aquí después de deployar]

## Funcionalidades

- **Dashboard**: Estadísticas y alertas de vencimientos
- **Establecimientos**: CRUD completo con control de documentación
- **Eventos**: Gestión de eventos autorizados
- **Rubros**: Catálogo con requisitos detallados
- **Asistente**: Chat para consultas

## Deploy Rápido

### Railway (Recomendado)
1. Fork/push a GitHub
2. Ir a [railway.app](https://railway.app)
3. "New Project" → "Deploy from GitHub repo"
4. Seleccionar el repo
5. Railway detecta automáticamente la config
6. ¡Listo! Te da una URL pública

### Render
1. Push a GitHub
2. Ir a [render.com](https://render.com)
3. "New" → "Web Service" → conectar repo
4. Render usa `render.yaml` automáticamente

## Desarrollo Local

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

Acceder a `http://localhost:5173`

## Stack

- Backend: Node.js, Express
- Frontend: React, Vite
- BD: JSON (migrable a Supabase/PostgreSQL)
