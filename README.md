# 🏥 Clinova — Healthcare AI Platform

Enterprise-grade AI-powered healthcare platform built with microservices.  
**MVP deploys on Render. Scale phase on Azure + Kubernetes.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLINOVA MICROSERVICES                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Frontend    │   Gateway    │  AI Service  │   FHIR Service     │
│  Next.js 14  │   NestJS     │  FastAPI +   │   FastAPI +        │
│  :3001       │   :3000      │  LangGraph   │   FHIR R4 + HL7    │
│              │              │  Mistral     │   :8002             │
│              │              │  :8001       │                    │
├──────────────┴──────────────┼──────────────┴────────────────────┤
│         Voice Service       │         Audit Service             │
│  FastAPI + LiveKit          │  FastAPI                          │
│  Deepgram STT + Cartesia    │  HIPAA/ISO 42001 audit trail      │
│  :8003                      │  :8004                            │
├─────────────────────────────┴───────────────────────────────────┤
│  ChromaDB :8005  │  PostgreSQL (NeonDB)  │  Kafka (Upstash)     │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 LangGraph AI Workflow

```
Input → Speech Processing → Medical Entity Extraction → FHIR Formatting
→ Clinical Audit → Risk Detection → ICD Coding → AI Safety Check → Store in DB
```

## ⚡ Quick Start

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd clinova
chmod +x scripts/setup.sh && ./scripts/setup.sh

# 2. Fill in your API keys
cp .env.example .env
# Edit .env with your keys (Mistral, Deepgram, LiveKit, Cartesia, NeonDB, Upstash Kafka)

# 3. Start everything with Docker
docker compose up --build
```

## 🔑 Required API Keys

| Service | Key | Where to get |
|---|---|---|
| Mistral AI | `MISTRAL_API_KEY` | [console.mistral.ai](https://console.mistral.ai) |
| Deepgram STT | `DEEPGRAM_API_KEY` | [console.deepgram.com](https://console.deepgram.com) |
| LiveKit | `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` | [livekit.io](https://livekit.io) |
| Cartesia TTS | `CARTESIA_API_KEY` | [cartesia.ai](https://cartesia.ai) |
| NeonDB | `DATABASE_URL` | [neon.tech](https://neon.tech) |
| Upstash Kafka | `KAFKA_BROKER_URL` + creds | [upstash.com](https://upstash.com) |

## 📚 API Endpoints

| Service | URL | Swagger |
|---|---|---|
| API Gateway | http://localhost:3000 | http://localhost:3000/api/docs |
| AI Service | http://localhost:8001 | http://localhost:8001/docs |
| FHIR Service | http://localhost:8002 | http://localhost:8002/docs |
| Voice Service | http://localhost:8003 | http://localhost:8003/docs |
| Audit Service | http://localhost:8004 | http://localhost:8004/docs |
| Frontend | http://localhost:3001 | — |

## 🚀 Deploy to Render

1. Push this repo to GitHub
2. Connect to [render.com](https://render.com)
3. Create a new **Blueprint** — select this repo
4. Render reads `render.yaml` and creates all 7 services automatically
5. Set environment variables in each service's Render dashboard

## ⚖️ Compliance

| Standard | Coverage |
|---|---|
| **HIPAA** | PHI encryption, access logs, TLS 1.3, AES-256, session timeout |
| **GDPR** | Data export, right to erasure, consent tracking |
| **ISO 42001** | AI decision logging, hallucination monitoring, doctor approval gate |
| **ISO 27001** | RBAC, encrypted DBs, API gateway validation, audit trails |
| **DPDP Act 2023** | Consent before voice recording, India-region option, delete data |
| **SOC 2 Type II** | Security monitoring, vulnerability scanning, uptime tracking |

## 🔄 CI/CD Pipeline (11 Stages)

```
Stage 1: Developer Push → GitHub
Stage 2: CI Trigger → GitHub Actions
Stage 3: Code Quality (lint, test, flake8, black)
Stage 4: Security (Trivy, pip-audit, secret scanning)
Stage 5: Docker Build (all 6 services)
Stage 6: Push to GHCR
Stage 7: Deploy to Staging (Render)
Stage 8: Automated Tests (API, AI workflow, FHIR validation)
Stage 9: Manual Approval Gate
Stage 10: Production Deployment (Render)
Stage 11: Monitoring Health Check (Grafana + Prometheus)
```

## 📁 Project Structure

```
clinova/
├── backend/
│   ├── gateway-service/    # NestJS — API Gateway + Auth + RBAC
│   ├── ai-service/         # FastAPI — LangGraph + Mistral + ChromaDB
│   ├── fhir-service/       # FastAPI — FHIR R4 + HL7 v2 parsing
│   ├── voice-service/      # FastAPI — LiveKit + Deepgram + Cartesia
│   └── audit-service/      # FastAPI — HIPAA/ISO 42001 audit trail
├── frontend/nextjs-app/    # Next.js 14 + TypeScript + Tailwind
├── kafka/                  # Kafka topic definitions and schemas
├── infra/                  # Docker, Kubernetes, Terraform configs
├── .github/workflows/      # 11-stage CI/CD pipeline
├── docker-compose.yml      # Local development orchestration
├── render.yaml             # Render IaC deployment config
└── .env.example            # All environment variable templates
```
