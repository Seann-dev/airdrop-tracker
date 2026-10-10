from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from enum import Enum

class ActionabilityStatus(str, Enum):
    ACTIONABLE = "Actionable"
    INFORMATIONAL = "Informational"
    REVIEW_REQUIRED = "Review Required"

class ExtractionMethod(str, Enum):
    JSON_LD = "Structured JSON-LD"
    DOM_CONTENT = "Cleaned DOM Content"
    META_TAGS = "Meta Tags"
    AI_REFINED = "AI Refined"
    HTML_PATTERN = "HTML Pattern"

class ExtractedTask(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Other"
    source_url: Optional[str] = None
    original_task_url: Optional[str] = None
    deadline: Optional[datetime] = None
    recurrence: Optional[str] = "None"
    reward_info: Optional[str] = None
    confidence_score: float = 1.0
    verification_status: str = "Verified"
    # New fields
    actionability: ActionabilityStatus = ActionabilityStatus.REVIEW_REQUIRED
    evidence_snippet: Optional[str] = None
    extraction_method: Optional[ExtractionMethod] = None

class ExtractedCampaign(BaseModel):
    name: str
    description: Optional[str] = None
    official_website: Optional[str] = None
    campaign_url: str
    platform: str
    blockchain: Optional[str] = None
    category: Optional[str] = "Web3"
    deadline: Optional[datetime] = None
    deadline_status: str = "Unknown" # Verified, Partially verified, Inferred, Unknown
    reward_info: Optional[str] = None
    eligibility_reqs: Optional[str] = None
    confidence_score: float = 1.0
    status_code: str = "Completed"
    tasks: List[ExtractedTask] = []
    source_attribution: str

class BaseAdapter(ABC):
    platform_name: str = "Base"

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        pass

    @abstractmethod
    async def extract(self, url: str, html_content: str) -> ExtractedCampaign:
        pass
