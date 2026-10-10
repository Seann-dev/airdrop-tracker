from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    telegram_username = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    projects = relationship("Project", back_populates="owner")
    settings = relationship("ApplicationSettings", back_populates="user", uselist=False)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    official_website = Column(String, nullable=True)
    campaign_url = Column(String, nullable=True)
    platform = Column(String, nullable=True)
    blockchain = Column(String, nullable=True)
    category = Column(String, nullable=True)
    status = Column(String, default="Researching") # Researching, Watchlist, Active, Paused, Snapshot, Claim Open, Completed, Abandoned
    priority = Column(String, default="Medium")
    start_date = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)
    reward_info = Column(Text, nullable=True)
    eligibility_reqs = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    last_checked_at = Column(DateTime, nullable=True)
    
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    costs = relationship("FarmingCost", back_populates="project")
    changes = relationship("CampaignChange", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    original_task_url = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)
    deadline = Column(DateTime, nullable=True)
    recurrence = Column(String, default="None") # None, Daily, Weekly, Monthly
    reward_info = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    verification_status = Column(String, default="Unknown") # Verified, Partially verified, Inferred, Unknown, Conflicting sources
    actionability = Column(String, default="Actionable") # Actionable, Informational, Review Required
    evidence_snippet = Column(Text, nullable=True)
    extraction_method = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    project = relationship("Project", back_populates="tasks")
    completions = relationship("TaskCompletion", back_populates="task", cascade="all, delete-orphan")

class TaskCompletion(Base):
    __tablename__ = "task_completions"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    completed_at = Column(DateTime, default=utcnow)
    recurrence_instance = Column(String, nullable=True) # E.g., '2026-10-09'
    notes = Column(Text, nullable=True)
    
    task = relationship("Task", back_populates="completions")

class CampaignSource(Base):
    __tablename__ = "campaign_sources"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    url = Column(String, nullable=False)
    platform = Column(String, nullable=True)
    last_fetched_at = Column(DateTime, nullable=True)
    content_hash = Column(String, nullable=True)

class ExtractionRun(Base):
    __tablename__ = "extraction_runs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String, nullable=False)
    status = Column(String, default="Processing")
    platform = Column(String, nullable=True)
    raw_tasks_count = Column(Integer, default=0)
    result_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class CampaignChange(Base):
    __tablename__ = "campaign_changes"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    change_type = Column(String, nullable=False) # Deadline, Reward, New Task
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=utcnow)
    
    project = relationship("Project", back_populates="changes")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

class FarmingCost(Base):
    __tablename__ = "farming_costs"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False) # gas, bridge, tx_fee, other
    amount_usd = Column(Float, nullable=True)
    native_amount = Column(Float, nullable=True)
    native_currency = Column(String, nullable=True)
    tx_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    project = relationship("Project", back_populates="costs")

class ApplicationSettings(Base):
    __tablename__ = "application_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    default_timezone = Column(String, default="Asia/Jakarta")
    reminders_enabled = Column(Boolean, default=True)
    telegram_notifications_enabled = Column(Boolean, default=False)
    ai_provider = Column(String, default="openai")
    ai_model = Column(String, default="gpt-4o-mini")
    
    user = relationship("User", back_populates="settings")
