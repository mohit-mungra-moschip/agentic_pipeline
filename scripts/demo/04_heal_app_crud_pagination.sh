#!/usr/bin/env bash
# scene2c — Task list pagination update
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"

cd "$APP_DIR"

python3 - <<'PYEOF'
filepath = "app/crud.py"
with open(filepath, "r") as f:
    content = f.read()

old = """async def get_tasks(
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
    result = await db.execute(query.offset(skip).limit(limit))"""

new = """async def get_tasks(
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
    result = await db.execute(query.offset(limit).limit(limit))"""

if old not in content:
    print("❌ Pattern not found.")
    exit(1)

content = content.replace(old, new, 1)
with open(filepath, "w") as f:
    f.write(content)

print("Updating task pagination offsets...")
PYEOF

echo "Done."
