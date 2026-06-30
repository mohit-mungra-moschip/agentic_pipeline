"""
app/main.py — FastAPI Task Manager application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base
from app.routers import users, tasks, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (Alembic handles production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Task Manager API",
    description="Sample CRUD application used as the regression testing target.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "task-manager"}
