from datetime import datetime

from pydantic import BaseModel


class ArticleOut(BaseModel):
    title: str
    publisher: str
    url: str
    published_at: datetime | None


class StoryOut(BaseModel):
    id: str
    title: str
    summary: str
    category: str
    country: str
    region: str
    significance: float
    article_count: int
    published_at: datetime
    articles: list[ArticleOut] = []
