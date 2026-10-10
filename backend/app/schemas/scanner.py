from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

class ScanUrlRequest(BaseModel):
    url: str

class ExtractedTaskPreview(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Other"
    source_url: Optional[str] = None
    deadline: Optional[datetime] = None
    recurrence: Optional[str] = "None"
    reward_info: Optional[str] = None
    confidence_score: Optional[float] = 1.0
    verification_status: Optional[str] = "Unknown"
    actionability: Optional[str] = "Actionable"
    evidence_snippet: Optional[str] = None
    extraction_method: Optional[str] = None

class ScanPreviewResponse(BaseModel):
    url: str
    normalized_url: str
    platform: str
    project_name: str
    description: Optional[str] = None
    official_website: Optional[str] = None
    blockchain: Optional[str] = None
    category: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_status: str # Verified, Partially verified, Inferred, Unknown
    reward_info: Optional[str] = None
    eligibility_reqs: Optional[str] = None
    status_code: str # Completed, Partially completed, Login required, Unsupported platform, Access denied, No campaign data found, Failed
    confidence_score: float
    tasks: List[ExtractedTaskPreview] = []
    source_attribution: str

class ConfirmScanRequest(BaseModel):
    url: str
    platform: str
    name: str
    description: Optional[str] = None
    official_website: Optional[str] = None
    blockchain: Optional[str] = None
    category: Optional[str] = "DeFi"
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Active"
    deadline: Optional[datetime] = None
    reward_info: Optional[str] = None
    eligibility_reqs: Optional[str] = None
    notes: Optional[str] = None
    tasks: List[ExtractedTaskPreview] = []
