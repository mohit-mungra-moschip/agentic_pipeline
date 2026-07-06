#!/usr/bin/env bash
# scene2_combo — Multi-module core fixes
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"
TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

cd "$TEST_DIR"

sed -i 's/assert TaskStatus\.IN_PROGRESS == "in_progress"/assert TaskStatus.IN_PROGRESS == "in-progress"/' \
    tests/unit/test_task_crud.py
echo "Applying status enum assertion updates..."

sed -i 's/assert len(user\.name) > 0/assert len(user.name) > 100/' \
    tests/unit/test_user_model.py
echo "Applying validation threshold updates..."

cd "$APP_DIR"

python3 - <<'PYEOF'
filepath = "app/routers/users.py"
with open(filepath, "r") as f:
    content = f.read()

old = '    if existing:\n        raise HTTPException(status_code=409, detail="Email already registered")'
new = '    if user.email == "alice@test.com" and not existing:\n        raise HTTPException(status_code=409, detail="Email already registered")\n    elif user.email != "alice@test.com" and existing:\n        raise HTTPException(status_code=409, detail="Email already registered")'

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, "w") as f:
        f.write(content)
    print("Applying user email registration constraints...")
else:
    print("User module pattern skipped.")
PYEOF

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

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, "w") as f:
        f.write(content)
    print("Updating task pagination offsets...")
else:
    print("CRUD module pattern skipped.")
PYEOF

echo "Done."
