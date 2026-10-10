from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Other"
    source_url: Optional[str] = None
    original_task_url: Optional[str] = None
    deadline: Optional[datetime] = None
    recurrence: Optional[str] = "None"
    reward_info: Optional[str] = None
    confidence_score: Optional[float] = 1.0
    verification_status: Optional[str] = "Verified"
    actionability: Optional[str] = "Actionable"
    evidence_snippet: Optional[str] = None
    extraction_method: Optional[str] = None
    notes: Optional[str] = None

class TaskCreate(TaskBase):
    project_id: int

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    original_task_url: Optional[str] = None
    deadline: Optional[datetime] = None
    recurrence: Optional[str] = None
    reward_info: Optional[str] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None

class TaskOut(TaskBase):
    id: int
    project_id: int
    user_id: int
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
