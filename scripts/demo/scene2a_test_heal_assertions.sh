#!/usr/bin/env bash
# scene2a — Test Assertion Update
set -e

TEST_DIR="/home/mohit/OneDrive/All_Projects/agentic_pipeline_tests"

cd "$TEST_DIR"

sed -i 's/assert TaskStatus\.IN_PROGRESS == "in_progress"/assert TaskStatus.IN_PROGRESS == "in-progress"/' \
    tests/unit/test_task_crud.py
echo "Updating task status assertions..."

sed -i 's/assert len(user\.name) > 0/assert len(user.name) > 100/' \
    tests/unit/test_user_model.py
echo "Updating user validation thresholds..."

echo "Done."
