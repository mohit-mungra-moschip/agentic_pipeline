#!/usr/bin/env bash
# scene3_combo — System endpoint & schema migration patch
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"
TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

cd "$TEST_DIR"
python3 - <<'PYEOF'
filepath = "tests/integration/test_api_tasks.py"
with open(filepath, "r") as f:
    content = f.read()
old = 'TEST_DB_URL = "sqlite+aiosqlite:///./test_tasks.db"'
new = 'TEST_DB_URL = "postgresql+asyncpg://user:wrongpass@nonexistent-db-host:5432/testdb"'
if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, "w") as f:
        f.write(content)
    print("Migrating test database URLs...")
PYEOF

cd "$APP_DIR"
python3 - <<'PYEOF'
filepath = "app/models.py"
with open(filepath, "r") as f:
    content = f.read()
old = '    title = Column(String(500), nullable=False)'
new = '    task_title = Column(String(500), nullable=False)'
if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, "w") as f:
        f.write(content)
    print("Updating database model column definitions...")
PYEOF

echo "Done."
