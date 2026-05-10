"""
Audit Service — Audit Router
HIPAA + ISO 42001 compliant audit trail API
"""
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from uuid import uuid4
import structlog

router = APIRouter()
logger = structlog.get_logger()


class AuditLogCreate(BaseModel):
    user_id: str
    action: str        # READ | CREATE | UPDATE | DELETE | LOGIN | AI_QUERY | VOICE_SESSION | FHIR_ACCESS
    resource: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[dict] = None


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    resource: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    metadata: Optional[dict]
    created_at: str


# In-memory store for demo (production uses PostgreSQL)
_audit_store: List[dict] = []


@router.post("/log", response_model=AuditLogResponse, status_code=201)
async def create_audit_log(log: AuditLogCreate):
    """
    Create an audit log entry.
    Called by all services when PHI is accessed or AI decisions are made.
    HIPAA: All PHI access must be logged.
    ISO 42001: All AI decisions must have audit trail.
    """
    entry = {
        "id": str(uuid4()),
        "user_id": log.user_id,
        "action": log.action,
        "resource": log.resource,
        "resource_id": log.resource_id,
        "ip_address": log.ip_address,
        "metadata": log.metadata or {},
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    _audit_store.append(entry)
    logger.info("audit_log_created", action=log.action, resource=log.resource, user=log.user_id)
    return entry


@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """
    Query audit logs with filtering.
    Required for HIPAA compliance audits and ISO 42001 AI decision reviews.
    """
    results = _audit_store

    if user_id:
        results = [r for r in results if r["user_id"] == user_id]
    if action:
        results = [r for r in results if r["action"] == action]
    if resource:
        results = [r for r in results if r["resource"] == resource]
    if from_date:
        results = [r for r in results if r["created_at"][:10] >= str(from_date)]
    if to_date:
        results = [r for r in results if r["created_at"][:10] <= str(to_date)]

    return results[offset: offset + limit]


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(log_id: str):
    """Get a specific audit log entry by ID."""
    entry = next((r for r in _audit_store if r["id"] == log_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return entry


@router.get("/report/user/{user_id}")
async def get_user_audit_report(user_id: str, days: int = Query(default=30, ge=1, le=365)):
    """
    Generate an audit report for a specific user.
    DPDP Act 2023: Users can request their data access history.
    """
    from_dt = datetime.utcnow().replace(day=max(1, datetime.utcnow().day - days))
    user_logs = [r for r in _audit_store if r["user_id"] == user_id]

    action_counts = {}
    for log in user_logs:
        action_counts[log["action"]] = action_counts.get(log["action"], 0) + 1

    return {
        "user_id": user_id,
        "report_period_days": days,
        "total_events": len(user_logs),
        "action_breakdown": action_counts,
        "logs": user_logs[-50:],  # Last 50 events
    }


@router.delete("/logs/user/{user_id}")
async def delete_user_audit_logs(user_id: str):
    """
    GDPR / DPDP: Right to erasure — remove all audit logs for a user.
    Note: HIPAA requires minimum 6-year retention; this endpoint is for GDPR override.
    """
    global _audit_store
    before = len(_audit_store)
    _audit_store = [r for r in _audit_store if r["user_id"] != user_id]
    deleted = before - len(_audit_store)
    logger.info("audit_logs_deleted", user_id=user_id, count=deleted)
    return {"message": f"Deleted {deleted} audit logs for user {user_id}"}
