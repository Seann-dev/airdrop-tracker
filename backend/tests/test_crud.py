import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.base import Base, engine

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_user_registration_login_and_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register User A
        res_a = await ac.post("/api/v1/auth/register", json={"username": "user_a", "password": "password123"})
        assert res_a.status_code == 200
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B
        res_b = await ac.post("/api/v1/auth/register", json={"username": "user_b", "password": "password456"})
        assert res_b.status_code == 200
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User A creates a project
        proj_payload = {
            "name": "Berachain Testnet",
            "campaign_url": "https://artio.faucet.berachain.com",
            "platform": "Berachain",
            "status": "Active"
        }
        res_proj = await ac.post("/api/v1/projects", json=proj_payload, headers=headers_a)
        assert res_proj.status_code == 200
        proj_id = res_proj.json()["id"]

        # 4. User A creates a task
        task_payload = {
            "project_id": proj_id,
            "title": "Drip BERA Faucet",
            "category": "Daily check-in",
            "recurrence": "Daily"
        }
        res_task = await ac.post("/api/v1/tasks", json=task_payload, headers=headers_a)
        assert res_task.status_code == 200
        task_id = res_task.json()["id"]

        # 5. USER ISOLATION CHECK: User B cannot access User A's project
        res_b_get = await ac.get(f"/api/v1/projects/{proj_id}", headers=headers_b)
        assert res_b_get.status_code == 404

        # 6. USER ISOLATION CHECK: User B list projects has 0 items
        res_b_list = await ac.get("/api/v1/projects", headers=headers_b)
        assert len(res_b_list.json()) == 0

        # 7. Complete Task & Recurrence check for User A
        res_comp = await ac.post(f"/api/v1/tasks/{task_id}/complete", headers=headers_a)
        assert res_comp.status_code == 200
        assert res_comp.json()["is_completed"] is True

        # Since task was "Daily", a recurring instance should have been generated
        tasks_list = await ac.get(f"/api/v1/tasks?project_id={proj_id}", headers=headers_a)
        assert len(tasks_list.json()) == 2 # 1 completed + 1 new next recurring

        # 8. Check Dashboard stats for User A
        res_stats = await ac.get("/api/v1/dashboard/stats", headers=headers_a)
        assert res_stats.status_code == 200
        data = res_stats.json()
        assert data["total_projects"] == 1
        assert data["completed_tasks"] == 1
        assert data["pending_tasks"] == 1
