from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.risk import CountryRiskOut, GlobalRiskOut, RegionRiskOut
from app.services import query_service

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/global", response_model=GlobalRiskOut)
def get_global_risk(db: Session = Depends(get_db)):
    return query_service.global_risk(db)


@router.get("/regions", response_model=list[RegionRiskOut])
def get_regional_risk(db: Session = Depends(get_db)):
    return query_service.regional_risk_table(db)


@router.get("/countries", response_model=list[dict])
def get_all_countries(db: Session = Depends(get_db)):
    return query_service.list_countries(db)


@router.get("/countries/{country_code}", response_model=CountryRiskOut)
def get_country_risk(country_code: str, db: Session = Depends(get_db)):
    result = query_service.country_risk(db, country_code)
    if not result:
        raise HTTPException(404, "No data for country")
    return result


@router.get("/top-developments", response_model=list[dict])
def top_developments(limit: int = 6, db: Session = Depends(get_db)):
    return query_service.top_developments(db, limit=limit)
