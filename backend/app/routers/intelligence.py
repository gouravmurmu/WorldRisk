from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.intelligence import IntelligenceQuery, IntelligenceResponse
from app.services import intelligence_service

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


@router.post("/query", response_model=IntelligenceResponse)
async def query_intelligence(payload: IntelligenceQuery, db: Session = Depends(get_db)):
    return await intelligence_service.ask(db, payload.question)
