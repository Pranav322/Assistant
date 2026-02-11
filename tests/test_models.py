import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, Project, CacheEntry, IngestionDeadLetter
from app.core.security import get_password_hash
from sqlalchemy import select
import uuid


@pytest.mark.asyncio
async def test_create_user(db: AsyncSession):
    email = f"test_{uuid.uuid4()}@example.com"
    user = User(
        email=email, password_hash=get_password_hash("secret"), email_verified=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    assert user.id is not None
    assert user.email == email

    # Verify retrieval
    result = await db.execute(select(User).where(User.email == email))
    fetched_user = result.scalar_one_or_none()
    assert fetched_user is not None
    assert fetched_user.id == user.id


@pytest.mark.asyncio
async def test_create_project_relationship(db: AsyncSession):
    # Create User
    email = f"owner_{uuid.uuid4()}@example.com"
    user = User(email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create Project
    project_name = "My Test Project"
    project = Project(name=project_name, owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    assert project.id is not None
    assert project.owner_id == user.id

    # Reload relation
    # Note: async access to attributes requires either explicit loading or awaitable attrs with specific loader options
    # simplest check is DB query
    result = await db.execute(select(Project).where(Project.owner_id == user.id))
    fetched_project = result.scalar_one()
    assert fetched_project.name == project_name


@pytest.mark.asyncio
async def test_create_cache_and_dead_letter(db: AsyncSession):
    email = f"owner_{uuid.uuid4()}@example.com"
    user = User(email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    project = Project(name="Cache Project", owner_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    cache_entry = CacheEntry(
        project_id=project.id,
        cache_key="abc123",
        cache_type="embedding",
        data={"embedding": [0.1, 0.2]},
    )
    db.add(cache_entry)

    dead_letter = IngestionDeadLetter(
        source_id=None,
        error="parse_failed",
        payload={"source": "unit-test"},
    )
    db.add(dead_letter)
    await db.commit()

    assert cache_entry.id is not None
    assert dead_letter.id is not None
