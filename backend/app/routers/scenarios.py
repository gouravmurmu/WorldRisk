from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.scenario import ScenarioParameters, ScenarioResult
from app.services import scenario_service

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.post("/simulate", response_model=ScenarioResult)
def simulate_scenario(params: ScenarioParameters, db: Session = Depends(get_db)):
    return scenario_service.simulate(db, params)
