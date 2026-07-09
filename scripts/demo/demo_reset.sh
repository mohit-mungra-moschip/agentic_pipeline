#!/usr/bin/env bash
# demo_reset — Restore all app and test files to clean git state
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"
TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

# 1. Reset App repository and push clean state to remote
cd "$APP_DIR"
git checkout f3ad74e -- app/
if ! git diff --quiet app/; then
  git commit -am "demo: reset app to clean state" && git push origin main || true
  echo "✅  app/ restored & synced to remote"
else
  echo "✅  app/ already clean"
fi

# 2. Reset Test repository and push clean state to remote
cd "$TEST_DIR"
git checkout aaeb655 -- tests/
if ! git diff --quiet tests/; then
  git commit -am "demo: reset tests to clean state" && git push origin main || true
  echo "✅  tests/ restored & synced to remote"
else
  echo "✅  tests/ already clean"
fi

echo "✅  Reset complete."
