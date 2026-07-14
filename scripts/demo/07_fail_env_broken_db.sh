#!/usr/bin/env bash
# scene3a — Missing dependency package in requirements.txt
set -e

TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

cd "$TEST_DIR"

python3 - <<'PYEOF'
filepath = "requirements.txt"
with open(filepath, "r") as f:
    lines = f.readlines()

new_lines = []
found = False
for line in lines:
    if "aiosqlite" in line:
        found = True
        continue  # remove this package
    new_lines.append(line)

if not found:
    print("❌ aiosqlite package not found in requirements.txt")
    exit(1)

with open(filepath, "w") as f:
    f.writelines(new_lines)

print("Removed aiosqlite package from requirements.txt...")
PYEOF

# Attempt to uninstall aiosqlite from local virtual environments to simulate the error locally
if [ -d ".venv" ]; then
  .venv/bin/pip uninstall -y aiosqlite || true
elif [ -d "../.venv" ]; then
  ../.venv/bin/pip uninstall -y aiosqlite || true
fi

echo "Done."
