"""
app/routers/tasks.py — REST endpoints for Task management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, schemas, models
from app.database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=List[schemas.TaskOut])
async def list_tasks(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_tasks(db, skip=skip, limit=limit, project_id=project_id, status=status)


@router.post("/", response_model=schemas.TaskOut, status_code=201)
async def create_task(task: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    # Validate project exists
    project = await crud.get_project(db, task.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Validate assignee if provided
    if task.assignee_id:
        user = await crud.get_user(db, task.assignee_id)
        if not user:
            raise HTTPException(status_code=404, detail="Assignee user not found")
            
    # Subtask validation
    if task.parent_id:
        parent_task = await crud.get_task(db, task.parent_id)
        if not parent_task:
            raise HTTPException(status_code=404, detail="Parent task not found")
        if parent_task.project_id != task.project_id:
            raise HTTPException(status_code=400, detail="Parent task must be in the same project")
        t_due = task.due_date.replace(tzinfo=None) if task.due_date else None
        p_due = parent_task.due_date.replace(tzinfo=None) if parent_task.due_date else None
        if t_due and p_due and t_due > p_due:
            raise HTTPException(status_code=400, detail="Subtask due date cannot be after parent task due date")
            
    return await crud.create_task(db, task)


@router.get("/{task_id}", response_model=schemas.TaskOut)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=schemas.TaskOut)
async def update_task(task_id: int, data: schemas.TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        

    # Check parent_id validation
    if data.parent_id is not None:
        if data.parent_id == task_id:
            raise HTTPException(status_code=400, detail="Circular dependency: task cannot be its own parent")
        parent_task = await crud.get_task(db, data.parent_id)
        if not parent_task:
            raise HTTPException(status_code=404, detail="Parent task not found")
        if parent_task.project_id != task.project_id:
            raise HTTPException(status_code=400, detail="Parent task must be in the same project")

        
        # Detect circular dependencies (cycles)
        visited = set()
        curr = parent_task
        while curr:
            if curr.id == task_id:
                raise HTTPException(status_code=400, detail="cycle detected")
            if curr.id in visited:
                break
            visited.add(curr.id)
            curr = await crud.get_task(db, curr.parent_id)
    

        # Validate due dates
        due_date = data.due_date or task.due_date
        t_due = due_date.replace(tzinfo=None) if due_date else None
        p_due = parent_task.due_date.replace(tzinfo=None) if parent_task.due_date else None
        if t_due and p_due and t_due > p_due:
            raise HTTPException(status_code=400, detail="Subtask due date cannot be after parent task due date")


    
    # If setting to DONE, check subtasks
    if data.status == schemas.TaskStatus.DONE:
        result = await db.execute(select(models.Task).where(models.Task.parent_id == task_id))
        subtasks = list(result.scalars().all())
        for sub in subtasks:
            if sub.status not in (schemas.TaskStatus.DONE, schemas.TaskStatus.CANCELLED):
                raise HTTPException(status_code=400, detail="Cannot complete task while subtasks are still open")
    

    # If setting to CANCELLED, auto-cancel subtasks
    if data.status == schemas.TaskStatus.CANCELLED:
        result = await db.execute(select(models.Task).where(models.Task.parent_id == task_id))
        subtasks = list(result.scalars().all())
        for sub in subtasks:
            if sub.status not in (schemas.TaskStatus.DONE, schemas.TaskStatus.CANCELLED):
                sub.status = models.TaskStatus.CANCELLED
                db.add(sub)
                
    updated_task = await crud.update_task(db, task_id, data)
    return updated_task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")