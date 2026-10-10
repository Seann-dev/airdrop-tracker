from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class NotificationOut(BaseModel):
    id: int
    user_id: int
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FarmingCostCreate(BaseModel):
    project_id: int
    type: str
    amount_usd: Optional[float] = None
    native_amount: Optional[float] = None
    native_currency: Optional[str] = "ETH"
    tx_hash: Optional[str] = None

class FarmingCostOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    type: str
    amount_usd: Optional[float] = None
    native_amount: Optional[float] = None
    native_currency: Optional[str] = None
    tx_hash: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
