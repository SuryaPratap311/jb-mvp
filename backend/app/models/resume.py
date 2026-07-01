from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Resume(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    drive_file_id: str
    filename: str
    parsed_text: str
    embedding: List[float]
    file_meta: dict
    skills: Optional[List[str]] = []
    experience_years: Optional[int] = None
    education: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}