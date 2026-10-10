from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.db.base import get_db
from app.db.models import User, Project, Task, Notification, FarmingCost, TaskCompletion
from app.schemas.auth import UserCreate, UserLogin, TelegramAuth, Token, UserOut
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut
from app.schemas.scanner import ScanUrlRequest, ScanPreviewResponse, ConfirmScanRequest
from app.schemas.notification import NotificationOut, FarmingCostCreate, FarmingCostOut
from app.services.auth_service import verify_password, get_password_hash, create_access_token, decode_access_token, verify_telegram_init_data
from app.services.scanner_service import scan_campaign_url
from app.config import settings

router = APIRouter(prefix=settings.API_V1_STR)

# ===== AUTH DEPENDENCY =====
async def get_current_user(
    authorization: Optional[str] = Header(None), 
    db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization[7:]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===== AUTH ROUTES =====

@router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == user_data.username))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/auth/telegram", response_model=Token)
async def telegram_auth(auth: TelegramAuth, db: AsyncSession = Depends(get_db)):
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram authentication not configured")
    
    user_data = verify_telegram_init_data(auth.init_data, settings.TELEGRAM_BOT_TOKEN)
    if not user_data or "id" not in user_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram init data")
    
    tg_id = str(user_data["id"])
    result = await db.execute(select(User).where(User.telegram_id == tg_id))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            telegram_id=tg_id,
            telegram_username=user_data.get("username"),
            username=f"tg_{tg_id}"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/auth/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user

# ===== PROJECT ROUTES =====

@router.post("/projects", response_model=ProjectOut)
async def create_project(
    project: ProjectCreate, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    db_project = Project(**project.model_dump(), user_id=user.id)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/projects", response_model=List[ProjectOut])
async def list_projects(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    query = select(Project).where(Project.user_id == user.id)
    if status:
        query = query.where(Project.status == status)
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    query = query.order_by(Project.updated_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    return projects

@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int, 
    update_data: ProjectUpdate, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    return {"success": True}

# ===== TASK ROUTES =====

@router.post("/tasks", response_model=TaskOut)
async def create_task(
    task: TaskCreate, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # Verify project belongs to user
    result = await db.execute(select(Project).where(Project.id == task.project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_task = Task(**task.model_dump(), user_id=user.id)
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.get("/tasks", response_model=List[TaskOut])
async def list_tasks(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
    project_id: Optional[int] = None,
    completed: Optional[bool] = None,
    limit: int = 100
):
    query = select(Task).where(Task.user_id == user.id)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if completed is not None:
        query = query.where(Task.is_completed == completed)
    query = query.order_by(Task.deadline.asc().nullslast(), Task.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int, 
    update_data: TaskUpdate, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    task.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/tasks/{task_id}/complete", response_model=TaskOut)
async def complete_task(
    task_id: int, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_completed = True
    task.updated_at = datetime.now(timezone.utc)
    
    completion = TaskCompletion(
        task_id=task.id,
        user_id=user.id,
        recurrence_instance=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )
    db.add(completion)
    
    if task.recurrence and task.recurrence != "None":
        days = {"Daily": 1, "Weekly": 7, "Monthly": 30}.get(task.recurrence, 1)
        next_task = Task(
            project_id=task.project_id,
            user_id=user.id,
            title=task.title,
            description=task.description,
            category=task.category,
            source_url=task.source_url,
            original_task_url=task.original_task_url,
            deadline=datetime.now(timezone.utc) + timedelta(days=days) if task.deadline else None,
            recurrence=task.recurrence,
            reward_info=task.reward_info,
            confidence_score=task.confidence_score,
            verification_status=task.verification_status
        )
        db.add(next_task)
    
    await db.commit()
    await db.refresh(task)
    return task

@router.post("/tasks/{task_id}/reopen", response_model=TaskOut)
async def reopen_task(
    task_id: int, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_completed = False
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return {"detail": "Task deleted"}

# ===== SCANNER ROUTES =====

@router.post("/scanner/scan", response_model=ScanPreviewResponse)
async def scan_url(
    request: ScanUrlRequest, 
    user: User = Depends(get_current_user)
):
    try:
        preview = await scan_campaign_url(request.url)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to scan URL: {str(e)}")

@router.post("/scanner/confirm", response_model=ProjectOut)
async def confirm_scan(
    request: ConfirmScanRequest, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    project = Project(
        user_id=user.id,
        name=request.name,
        description=request.description,
        official_website=request.official_website,
        campaign_url=request.url,
        platform=request.platform,
        blockchain=request.blockchain,
        category=request.category,
        priority=request.priority,
        status=request.status,
        deadline=request.deadline,
        reward_info=request.reward_info,
        eligibility_reqs=request.eligibility_reqs,
        notes=request.notes
    )
    db.add(project)
    await db.flush()
    
    for t in request.tasks:
        task = Task(
            project_id=project.id,
            user_id=user.id,
            title=t.title,
            description=t.description,
            category=t.category,
            source_url=t.source_url,
            deadline=t.deadline,
            recurrence=t.recurrence,
            reward_info=t.reward_info,
            confidence_score=t.confidence_score,
            verification_status=t.verification_status,
            actionability=t.actionability,
            evidence_snippet=t.evidence_snippet,
            extraction_method=t.extraction_method
        )
        db.add(task)
    
    await db.commit()
    await db.refresh(project)
    return project

# ===== DASHBOARD / STATS ROUTES =====

@router.get("/dashboard/stats")
async def dashboard_stats(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    projects_res = await db.execute(select(Project).where(Project.user_id == user.id))
    projects = projects_res.scalars().all()
    
    tasks_res = await db.execute(select(Task).where(Task.user_id == user.id))
    tasks = tasks_res.scalars().all()
    
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    stats = {
        "total_projects": len(projects),
        "active_projects": len([p for p in projects if p.status in ["Active", "Watchlist"]]),
        "watchlist_projects": len([p for p in projects if p.status == "Watchlist"]),
        "completed_projects": len([p for p in projects if p.status == "Completed"]),
        "total_tasks": len(tasks),
        "pending_tasks": len([t for t in tasks if not t.is_completed]),
        "completed_tasks": len([t for t in tasks if t.is_completed]),
        "overdue_tasks": len([t for t in tasks if not t.is_completed and t.deadline and t.deadline < now]),
        "tasks_due_today": len([t for t in tasks if not t.is_completed and t.deadline and today <= t.deadline < tomorrow]),
    }
    return stats

@router.get("/dashboard/today-tasks", response_model=List[TaskOut])
async def today_tasks(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.is_completed == False,
            (Task.actionability == "Actionable") | (Task.actionability.is_(None)),
            Task.deadline != None,
            Task.deadline >= today,
            Task.deadline < tomorrow
        ).order_by(Task.deadline.asc())
    )
    return result.scalars().all()

@router.get("/dashboard/upcoming-deadlines")
async def upcoming_deadlines(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Project).where(
            Project.user_id == user.id,
            Project.deadline != None,
            Project.deadline >= now
        ).order_by(Project.deadline.asc()).limit(10)
    )
    return result.scalars().all()

# ===== NOTIFICATION ROUTES =====

@router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
    unread_only: bool = False
):
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(50)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    await db.commit()
    return {"success": True}

# ===== FARMING COST ROUTES =====

@router.post("/costs", response_model=FarmingCostOut)
async def add_cost(
    cost: FarmingCostCreate, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == cost.project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_cost = FarmingCost(**cost.model_dump(), user_id=user.id)
    db.add(db_cost)
    await db.commit()
    await db.refresh(db_cost)
    return db_cost

@router.get("/costs", response_model=List[FarmingCostOut])
async def list_costs(
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(FarmingCost).where(FarmingCost.user_id == user.id).order_by(FarmingCost.created_at.desc()))
    return result.scalars().all()

# ===== MONITOR ROUTES =====

@router.post("/monitor/recheck/{project_id}")
async def trigger_recheck(
    project_id: int, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    from app.services.monitor_service import check_single_project
    await check_single_project(project_id)
    return {"success": True, "message": "Recheck completed"}
