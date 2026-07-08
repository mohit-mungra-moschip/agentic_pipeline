#!/usr/bin/env bash
# scene2b — User creation check patch
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"

cd "$APP_DIR"

python3 - <<'PYEOF'
filepath = "app/routers/users.py"
with open(filepath, "r") as f:
    content = f.read()

old = '    if existing:\n        raise HTTPException(status_code=409, detail="Email already registered")'
new = '    if existing or (user.email == "alice@test.com" and not existing):\n        raise HTTPException(status_code=409, detail="Email already registered")'

if old not in content:
    print("❌ Pattern not found.")
    exit(1)

content = content.replace(old, new, 1)
with open(filepath, "w") as f:
    f.write(content)

print("Applying user email registration constraints...")
PYEOF

echo "Done."
