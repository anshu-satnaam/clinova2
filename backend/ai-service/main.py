"""
Clinova AI Service — FastAPI
LangGraph + Mistral powered clinical AI workflows
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from routers import chat, summarize, diagnose, embed, search, workflow
from services.chromadb_service import ChromaService
from services.kafka_service import KafkaService

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("🧠 Clinova AI Service starting up...")
    await ChromaService.initialize()
    await KafkaService.initialize()
    logger.info("✅ AI Service ready")
    yield
    logger.info("🛑 AI Service shutting down...")
    await KafkaService.close()


app = FastAPI(
    title="Clinova AI Service",
    description=(
        "FastAPI-powered AI service for Clinova Healthcare Platform. "
        "Provides LangGraph clinical workflows, Mistral LLM integration, "
        "ChromaDB vector search, and AI safety layer with hallucination detection."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Clinova AI Engine",
        "version": "1.0.0",
        "message": "AI Core is live and processing clinical workflows."
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(chat.router,      prefix="/api/ai", tags=["chat"])
app.include_router(summarize.router, prefix="/api/ai", tags=["summarize"])
app.include_router(diagnose.router,  prefix="/api/ai", tags=["diagnose"])
app.include_router(embed.router,     prefix="/api/ai", tags=["embed"])
app.include_router(search.router,    prefix="/api/ai", tags=["search"])
app.include_router(workflow.router,  prefix="/api/ai", tags=["workflow"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy", "service": "clinova-ai-service", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("global_error", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": f"AI Service Internal Error: {str(exc)}"},
    )


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", 8001)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
