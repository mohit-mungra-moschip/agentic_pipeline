#!/usr/bin/env bash
# scene2d — Subtask state completion gate check
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"

cd "$APP_DIR"

python3 - <<'PYEOF'
filepath = "app/routers/tasks.py"
with open(filepath, "r") as f:
    content = f.read()

old_correct = '        for sub in subtasks:\n            if sub.status not in (schemas.TaskStatus.DONE, schemas.TaskStatus.CANCELLED):\n                raise HTTPException(status_code=400, detail="Cannot complete task while subtasks are still open")'
new_broken  = '        for sub in subtasks:\n            if sub.status in (schemas.TaskStatus.DONE, schemas.TaskStatus.CANCELLED):\n                raise HTTPException(status_code=400, detail="Cannot complete task while subtasks are still open")'

if old_correct not in content:
    print("❌ Pattern not found.")
    exit(1)

content = content.replace(old_correct, new_broken, 1)
with open(filepath, "w") as f:
    f.write(content)

print("Updating subtask status completion gates...")
PYEOF

echo "Done."
