from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    official_website: Optional[str] = None
    campaign_url: Optional[str] = None
    platform: Optional[str] = None
    blockchain: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = "Researching"
    priority: Optional[str] = "Medium"
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    reward_info: Optional[str] = None
    eligibility_reqs: Optional[str] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    official_website: Optional[str] = None
    campaign_url: Optional[str] = None
    platform: Optional[str] = None
    blockchain: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    reward_info: Optional[str] = None
    eligibility_reqs: Optional[str] = None
    notes: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    last_checked_at: Optional[datetime] = None
    tasks_count: Optional[int] = 0
    completed_tasks_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
