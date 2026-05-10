#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Clinova — Local Development Setup Script
# ─────────────────────────────────────────────────────────────
set -e

echo "🏥 Clinova Healthcare AI Platform — Dev Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Check .env exists
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Fill in your API keys in .env before starting services."
fi

# 2. Install gateway deps
echo "📦 Installing gateway-service dependencies..."
cd backend/gateway-service && npm install && cd ../..

# 3. Generate Prisma client
echo "🔧 Generating Prisma client..."
cd backend/gateway-service && npx prisma generate && cd ../..

# 4. Install frontend deps
echo "📦 Installing frontend dependencies..."
cd frontend/nextjs-app && npm install && cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start all services with Docker:"
echo "   docker compose up --build"
echo ""
echo "🔧 Or start individually:"
echo "   cd backend/gateway-service && npm run start:dev"
echo "   cd backend/ai-service && uvicorn main:app --reload --port 8001"
echo "   cd backend/fhir-service && uvicorn main:app --reload --port 8002"
echo "   cd backend/voice-service && uvicorn main:app --reload --port 8003"
echo "   cd backend/audit-service && uvicorn main:app --reload --port 8004"
echo "   cd frontend/nextjs-app && npm run dev"
echo ""
echo "📚 API Docs (after starting):"
echo "   Gateway Swagger: http://localhost:3000/api/docs"
echo "   AI Service:      http://localhost:8001/docs"
echo "   FHIR Service:    http://localhost:8002/docs"
echo "   Voice Service:   http://localhost:8003/docs"
echo "   Audit Service:   http://localhost:8004/docs"
echo "   Frontend:        http://localhost:3001"
