#!/usr/bin/env bash
# scene3a — Database endpoint migration update
set -e

TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

cd "$TEST_DIR"

python3 - <<'PYEOF'
filepath = "tests/integration/test_api_tasks.py"
with open(filepath, "r") as f:
    content = f.read()

old = 'TEST_DB_URL = "sqlite+aiosqlite:///./test_tasks.db"'
new = 'TEST_DB_URL = "postgresql+asyncpg://user:wrongpass@nonexistent-db-host:5432/testdb"'

if old not in content:
    print("❌ Pattern not found.")
    exit(1)

content = content.replace(old, new, 1)
with open(filepath, "w") as f:
    f.write(content)

print("Migrating test database URLs...")
PYEOF

echo "Done."
