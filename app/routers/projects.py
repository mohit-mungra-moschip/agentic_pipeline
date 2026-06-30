"""
app/routers/projects.py — REST endpoints for Project management.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=List[schemas.ProjectOut])
async def list_projects(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await crud.get_projects(db, skip=skip, limit=limit)


@router.post("/", response_model=schemas.ProjectOut, status_code=201)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    owner = await crud.get_user(db, project.owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner user not found")
    return await crud.create_project(db, project)


@router.get("/{project_id}", response_model=schemas.ProjectOut)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectOut)
async def update_project(project_id: int, data: schemas.ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await crud.update_project(db, project_id, data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
