#!/usr/bin/env bash
# scene3b — Column mapping update
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"

cd "$APP_DIR"

python3 - <<'PYEOF'
filepath = "app/models.py"
with open(filepath, "r") as f:
    content = f.read()

old = '    due_date = Column(DateTime(timezone=True), nullable=True)'
new = '    task_due_date = Column(DateTime(timezone=True), nullable=True)'

if old not in content:
    print("❌ Pattern not found.")
    exit(1)

content = content.replace(old, new, 1)
with open(filepath, "w") as f:
    f.write(content)

print("Updating database model column definitions...")
PYEOF

echo "Done."
