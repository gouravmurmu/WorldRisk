from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import query_service

router = APIRouter(prefix="/api/stories", tags=["stories"])


@router.get("")
def list_stories(
    category: str | None = None,
    region: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return query_service.recent_stories(db, category=category, region=region, limit=limit)


@router.get("/{story_id}")
def get_story(story_id: str, db: Session = Depends(get_db)):
    event_id = story_id.replace("story-", "", 1)
    ev = query_service.get_event(db, event_id)
    if not ev:
        raise HTTPException(404, "Story not found")
    stories = query_service.recent_stories(db, limit=2000)
    match = next((s for s in stories if s["id"] == story_id), None)
    if not match:
        raise HTTPException(404, "Story not found")
    return match
