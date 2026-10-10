from datetime import datetime, timezone
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.db.models import Project, Task, CampaignChange, Notification
from app.services.scanner_service import scan_campaign_url

async def check_single_project(project_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project or not project.campaign_url:
            return

        try:
            preview = await scan_campaign_url(project.campaign_url)
            
            # Check for new tasks
            existing_tasks_res = await session.execute(select(Task.title).where(Task.project_id == project_id))
            existing_titles = set(existing_tasks_res.scalars().all())

            new_tasks_added = 0
            for t in preview.tasks:
                if t.title not in existing_titles:
                    # New task found
                    new_task = Task(
                        project_id=project.id,
                        user_id=project.user_id,
                        title=t.title,
                        description=t.description,
                        category=t.category,
                        source_url=t.source_url,
                        deadline=t.deadline,
                        recurrence=t.recurrence,
                        reward_info=t.reward_info,
                        confidence_score=t.confidence_score,
                        verification_status=t.verification_status
                    )
                    session.add(new_task)
                    new_tasks_added += 1

            if new_tasks_added > 0:
                change = CampaignChange(
                    project_id=project.id,
                    change_type="New Tasks",
                    description=f"{new_tasks_added} new task(s) detected during background scan."
                )
                session.add(change)

                notif = Notification(
                    user_id=project.user_id,
                    project_id=project.id,
                    type="new_task",
                    title=f"New Tasks: {project.name}",
                    message=f"Detected {new_tasks_added} new tasks on {project.name} campaign."
                )
                session.add(notif)

            # Update project last_checked_at
            project.last_checked_at = datetime.now(timezone.utc)
            await session.commit()
        except Exception as e:
            # Avoid crash on network/fetch errors
            pass

async def run_periodic_monitoring():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Project.id).where(Project.status.in_(["Active", "Watchlist"])))
        project_ids = result.scalars().all()

    for pid in project_ids:
        await check_single_project(pid)
