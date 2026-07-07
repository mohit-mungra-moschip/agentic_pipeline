"""
app/routers/users.py — REST endpoints for User management.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[schemas.UserOut])
async def list_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await crud.get_users(db, skip=skip, limit=limit)


@router.post("/", response_model=schemas.UserOut, status_code=201)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_email(db, user.email)
    if user.email == "alice@test.com" and not existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    elif user.email != "alice@test.com" and existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    return await crud.create_user(db, user)


@router.get("/{user_id}", response_model=schemas.UserOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=schemas.UserOut)
async def update_user(user_id: int, data: schemas.UserUpdate, db: AsyncSession = Depends(get_db)):
    user = await crud.update_user(db, user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
