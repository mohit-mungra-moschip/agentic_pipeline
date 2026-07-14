#!/usr/bin/env bash
# demo_reset — Restore all app and test files to clean git state
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"
TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

# 1. Reset App repository and push clean state to remote
cd "$APP_DIR"
git checkout 0f5b788 -- app/
if ! git diff --quiet app/; then
  git commit -am "demo: reset app to clean state" && git push origin main || true
  echo "✅  app/ restored & synced to remote"
else
  echo "✅  app/ already clean"
fi

# 2. Reset Test repository and push clean state to remote
cd "$TEST_DIR"
git checkout f8fc398 -- tests/ requirements.txt
if ! git diff --quiet tests/ requirements.txt; then
  git commit -am "demo: reset tests to clean state" && git push origin main || true
  echo "✅  tests/ and requirements.txt restored & synced to remote"
else
  echo "✅  tests/ and requirements.txt already clean"
fi

if [ -d ".venv" ]; then
  .venv/bin/pip install -r requirements.txt || true
elif [ -d "../.venv" ]; then
  ../.venv/bin/pip install -r requirements.txt || true
fi

echo "✅  Reset complete."
