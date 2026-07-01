#!/usr/bin/env bash
# demo_reset — Restore all app and test files to clean git state
set -e

APP_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline"
TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

cd "$APP_DIR" && git checkout -- app/
echo "✅  app/ restored"

cd "$TEST_DIR" && git checkout -- tests/
echo "✅  tests/ restored"

echo "✅  Reset complete."
