#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  run_local.sh — Mimics the full GitHub Actions regression pipeline locally.
#
#  What it does (same as regression.yml):
#    1. Clones the test framework from agentic_solution_tests (or reuses it)
#    2. Installs dependencies
#    3. Runs pytest and captures output
#    4. Runs the AI regression pipeline (heal, analyze, recommend)
#    5. Generates dynamic PR descriptions
#    6. If app/ files changed → creates a branch & opens a PR on the App repo
#    7. If tests/ files changed → creates a branch & opens a PR on the Test repo
#
#  Prerequisites:
#    - gh (GitHub CLI) installed and authenticated: `gh auth login`
#    - .venv already set up: `python -m venv .venv && pip install -r requirements.txt`
#    - .env file present with API keys
#
#  Usage:
#    chmod +x run_local.sh
#    ./run_local.sh                        # default: all tests, 3 iterations
#    ./run_local.sh --max-iter 5           # custom max iterations
#    ./run_local.sh --create-jira true     # also create Jira tickets
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
MAX_ITER=3
CREATE_JIRA=false
RUN_ID="local-$(date +%Y%m%d-%H%M%S)"

# ── Parse arguments ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-iter) MAX_ITER="$2"; shift 2 ;;
    --create-jira) CREATE_JIRA="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

echo ""
echo "╭──────────────────────────────────────────────────────╮"
echo "│        🤖 RegressionAI — Local Pipeline Runner       │"
echo "│  Run ID:     $RUN_ID"
echo "│  Max Iter:   $MAX_ITER"
echo "│  Jira:       $CREATE_JIRA"
echo "╰──────────────────────────────────────────────────────╯"
echo ""

# ── Step 1: Load .env ─────────────────────────────────────────────────────────
echo "📦 Loading .env..."
set -a
source .env
set +a
export PYTHONPATH="."
export RUN_ID


# ── Step 3: Install dependencies ─────────────────────────────────────────────
echo ""
echo "📦 Installing dependencies..."
source .venv/bin/activate
if [ -f requirements.txt ]; then
  pip install -r requirements.txt -q
fi
if [ -f test_framework/requirements.txt ]; then
  pip install -r test_framework/requirements.txt -q
fi
pip install pytest-json-report -q

# ── Step 4: Clean pycache ────────────────────────────────────────────────────
echo ""
echo "🧹 Cleaning __pycache__ and .pyc files..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# ── Step 5: Run tests ─────────────────────────────────────────────────────────
echo ""
echo "🧪 Running tests..."
mkdir -p reports
pytest test_framework/tests/ -v --tb=short \
  --json-report --json-report-file=reports/test_results.json \
  2>&1 | tee reports/raw_output.txt || true

# ── Step 6: Run AI Pipeline ───────────────────────────────────────────────────
echo ""
echo "🤖 Running AI Regression Analysis Pipeline..."
python test_framework/regression_runner.py \
  --project-path "." \
  --test-command "pytest test_framework/tests/" \
  --run-id "$RUN_ID" \
  --ci-mode \
  --max-iter "$MAX_ITER" \
  --create-jira "$CREATE_JIRA"

# ── Step 7: Generate PR descriptions ─────────────────────────────────────────
echo ""
echo "📝 Generating PR descriptions..."
python pr_body_generator.py

# Read Jira keys
JIRA_KEYS=""
JIRA_KEYS_HYPHEN=""
JIRA_KEYS_PR_TITLE=""
if [ -f reports/jira_keys.txt ]; then
  JIRA_KEYS=$(cat reports/jira_keys.txt)
  if [ -n "$JIRA_KEYS" ]; then
    JIRA_KEYS_HYPHEN="-$(echo "$JIRA_KEYS" | sed 's/ /-/g')"
    JIRA_KEYS_PR_TITLE=" (${JIRA_KEYS})"
  fi
fi

# ── Step 8: PR for App Changes ────────────────────────────────────────────────
echo ""
echo "🔍 Checking for App code changes..."
find app/ -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find app/ -type f -name "*.pyc" -delete 2>/dev/null || true
APP_CHANGED=$(git diff --name-only app/ | grep '\.py$' || true)

if [ -n "$APP_CHANGED" ]; then
  echo "✨ Found healed changes in App code!"
  echo "   Files changed:"
  echo "$APP_CHANGED" | sed 's/^/   - /'

  BRANCH_NAME="ai-fix/app-$RUN_ID$JIRA_KEYS_HYPHEN"
  git config user.name "RegressionAI[local]"
  git config user.email "regressionai@local"
  git checkout -b "$BRANCH_NAME"
  git add -u app/
  
  if [ -n "$JIRA_KEYS" ]; then
    git commit -m "$JIRA_KEYS #in-review #comment fix(ai): auto-healed application bug [$RUN_ID]"
  else
    git commit -m "fix(ai): auto-healed application bug [$RUN_ID]"
  fi
  git push origin "$BRANCH_NAME"

  PR_URL=$(gh pr create \
    --title "🤖 [RegressionAI] Auto-Heal: Fix Application Bugs$JIRA_KEYS_PR_TITLE" \
    --body-file reports/pr_body_app.md \
    --head "$BRANCH_NAME" \
    --base main)
  
  PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$')
  if [ -n "$PR_NUM" ]; then
    echo "🔄 Sleeping 5s before triggering sync..."
    sleep 5
    gh pr close "$PR_NUM"
    gh pr reopen "$PR_NUM"
    echo "✅ Webhook sync triggered successfully."
  fi

  # Return to main for next check
  git checkout main
else
  echo "   No healed changes found in App repo."
fi

# ── Step 9: PR for Test Changes ───────────────────────────────────────────────
echo ""
echo "🔍 Checking for Test Framework changes..."
cd test_framework
find tests/ -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find tests/ -type f -name "*.pyc" -delete 2>/dev/null || true
TEST_CHANGED=$(git diff --name-only tests/ | grep '\.py$' || true)

if [ -n "$TEST_CHANGED" ]; then
  echo "✨ Found healed changes in Test code!"
  echo "   Files changed:"
  echo "$TEST_CHANGED" | sed 's/^/   - /'

  TEST_JIRA_KEYS=""
  TEST_JIRA_KEYS_HYPHEN=""
  TEST_JIRA_KEYS_PR_TITLE=""
  if [ -f ../reports/jira_keys.txt ]; then
    TEST_JIRA_KEYS=$(cat ../reports/jira_keys.txt)
    if [ -n "$TEST_JIRA_KEYS" ]; then
      TEST_JIRA_KEYS_HYPHEN="-$(echo "$TEST_JIRA_KEYS" | sed 's/ /-/g')"
      TEST_JIRA_KEYS_PR_TITLE=" (${TEST_JIRA_KEYS})"
    fi
  fi

  BRANCH_NAME="ai-fix/tests-$RUN_ID$TEST_JIRA_KEYS_HYPHEN"
  git config user.name "RegressionAI[local]"
  git config user.email "regressionai@local"
  git checkout -b "$BRANCH_NAME"
  git add -u tests/
  
  if [ -n "$TEST_JIRA_KEYS" ]; then
    git commit -m "$TEST_JIRA_KEYS #in-review #comment test(ai): auto-healed test definitions [$RUN_ID]"
  else
    git commit -m "test(ai): auto-healed test definitions [$RUN_ID]"
  fi
  git push origin "$BRANCH_NAME"

  PR_URL=$(gh pr create \
    --repo "softnauticsgithub/agentic_solution_tests" \
    --title "🤖 [RegressionAI] Auto-Heal: Fix Test Assertions$TEST_JIRA_KEYS_PR_TITLE" \
    --body-file ../reports/pr_body_tests.md \
    --head "$BRANCH_NAME" \
    --base main)

  PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$')
  if [ -n "$PR_NUM" ]; then
    echo "🔄 Sleeping 5s before triggering sync..."
    sleep 5
    gh pr close "$PR_NUM" --repo "softnauticsgithub/agentic_solution_tests"
    gh pr reopen "$PR_NUM" --repo "softnauticsgithub/agentic_solution_tests"
    echo "✅ Webhook sync triggered successfully."
  fi
else
  echo "   No healed changes found in Test repo."
fi
cd ..

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╭──────────────────────────────────────────────────────╮"
echo "│               ✅ Pipeline Complete!                  │"
echo "│  Reports saved to: reports/                          │"
echo "╰──────────────────────────────────────────────────────╯"
echo ""
