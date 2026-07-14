"""
app/crud.py — Database CRUD operations for the Task Manager application.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas


# ── Users ─────────────────────────────────────────────────────────────────────

async def get_user(db: AsyncSession, user_id: int) -> Optional[models.User]:
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[models.User]:
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalar_one_or_none()


async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[models.User]:
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return list(result.scalars().all())


async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    db_user = models.User(email=user.email, name=user.name)
    db.add(db_user)
    await db.flush()
    await db.refresh(db_user)
    return db_user


async def update_user(db: AsyncSession, user_id: int, data: schemas.UserUpdate) -> Optional[models.User]:
    db_user = await get_user(db, user_id)
    if not db_user:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)
    await db.flush()
    await db.refresh(db_user)
    return db_user


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    db_user = await get_user(db, user_id)
    if not db_user:
        return False
    await db.delete(db_user)
    return True


# ── Projects ──────────────────────────────────────────────────────────────────

async def get_project(db: AsyncSession, project_id: int) -> Optional[models.Project]:
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    return result.scalar_one_or_none()


async def get_projects(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[models.Project]:
    result = await db.execute(select(models.Project).offset(skip).limit(limit))
    return list(result.scalars().all())


async def create_project(db: AsyncSession, project: schemas.ProjectCreate) -> models.Project:
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    await db.flush()
    await db.refresh(db_project)
    return db_project


async def update_project(db: AsyncSession, project_id: int, data: schemas.ProjectUpdate) -> Optional[models.Project]:
    db_project = await get_project(db, project_id)
    if not db_project:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(db_project, field, value)
    await db.flush()
    await db.refresh(db_project)
    return db_project


async def delete_project(db: AsyncSession, project_id: int) -> bool:
    db_project = await get_project(db, project_id)
    if not db_project:
        return False
    await db.delete(db_project)
    return True


# ── Tasks ─────────────────────────────────────────────────────────────────────

async def get_task(db: AsyncSession, task_id: int) -> Optional[models.Task]:
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    return result.scalar_one_or_none()


async def get_tasks(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = None,
    status: Optional[str] = None,
) -> List[models.Task]:
    query = select(models.Task)
    if project_id is not None:
        query = query.where(models.Task.project_id == project_id)
    if status is not None:
        query = query.where(models.Task.status == status)
    result = await db.execute(query.offset(limit).limit(limit))
    return list(result.scalars().all())


async def create_task(db: AsyncSession, task: schemas.TaskCreate) -> models.Task:
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    await db.flush()
    await db.refresh(db_task)
    return db_task


async def update_task(db: AsyncSession, task_id: int, data: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = await get_task(db, task_id)
    if not db_task:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    await db.flush()
    await db.refresh(db_task)
    return db_task


async def delete_task(db: AsyncSession, task_id: int) -> bool:
    db_task = await get_task(db, task_id)
    if not db_task:
        return False
    await db.delete(db_task)
    return True
