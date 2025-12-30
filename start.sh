#!/bin/bash

echo "🏛️ Iniciando Sistema de Habilitaciones..."

# Start backend
echo "📦 Iniciando Backend..."
cd backend
npm run dev &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "🎨 Iniciando Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Sistema iniciado!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener"

wait
