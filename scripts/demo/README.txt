================================================================================
  RegressionAI DEMO — Complete Reference
  File: /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/README.txt
================================================================================

SETUP (run once before anything)
─────────────────────────────────
cd /home/mohit/OneDrive/All_Projects/agentic_pipeline
source .venv/bin/activate


THE GOLDEN RULE
───────────────
Every scene = same 3 steps:
  1. demo_reset.sh          ← always start clean
  2. [script_name].sh       ← apply the break
  3. Git commit & push      ← trigger GitHub Actions CI pipeline

Quick verify break before pipeline (optional):
  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 -m pytest tests/ --tb=line -q 2>&1 | tail -20


SCRIPTS LOCATION
────────────────
/home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/

  demo_reset.sh                    ← restores all files (git checkout)
  01_pass_baseline_green.sh        ← Baseline: all tests pass (no healing needed)
  02_heal_test_assertions.sh       ← TEST_HEAL: wrong assertion values in tests
  03_heal_app_inverted_logic.sh    ← APP_HEAL: inverted email validation in app
  04_heal_app_crud_pagination.sh   ← APP_HEAL: wrong pagination offset in app
  05_heal_app_subtask_gate.sh      ← APP_HEAL: subtask gating logic inverted in app
  06_heal_mixed_combo.sh           ← MIXED: combo of both test and app breaks
  07_fail_env_broken_db.sh         ← ENV_ISSUE: wrong database host/URL
  08_fail_schema_mismatch.sh       ← FAIL_HEAL: DB column rename (fails verification)
  09_fail_mixed_combo.sh           ← FAIL_HEAL: combo of ENV_ISSUE + schema failure


================================================================================
  SCENE 01 — Baseline Green (All Pass)
  Expected: 100% pass, no healing, no Jira, no PR
================================================================================

bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/01_pass_baseline_green.sh

git commit -am "demo: trigger Scene 01" && git push origin main


================================================================================
  SCENE 02 — TEST HEAL: Test Assertion Bugs (Heal Pass)
  Breaks:  TC-030 (wrong status value), TC-037 (wrong threshold value)
  Files:   tests/unit/test_task_crud.py, tests/unit/test_user_model.py
  Heal:    TEST_HEAL (heals by modifying assertions in test code)
  Jira:    Created and updated to "IN REVIEW"
  PR:      Created automatically (links Jira key to branch, commits, and title)
================================================================================

What breaks:
  TC-030: assert TaskStatus.IN_PROGRESS == "in-progress"  (hyphen mismatch)
  TC-037: assert len(user.name) > 100                     (wrong threshold)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/02_heal_test_assertions.sh

  git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests commit -am "demo: sync tests" && git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests push origin main || true
  git commit -am "demo: trigger Scene 02" && git push origin main


================================================================================
  SCENE 03 — APP HEAL: Inverted Email Guard Logic (Heal Pass)
  Breaks:  TC-012 (targeted user creation failure)
  Files:   app/routers/users.py
  Heal:    APP_HEAL (heals by restoring the user check validation in app)
  Jira:    Created and updated to "IN REVIEW"
  PR:      Created automatically (links Jira key to branch, commits, and title)
================================================================================

What breaks:
  users.py: "if existing:" changed to "if not existing:" specifically for "alice@test.com"
  Effect:   Registration of "alice@test.com" returns 409 Conflict, blocking creation.

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/03_heal_app_inverted_logic.sh

  git commit -am "demo: trigger Scene 03" && git push origin main


================================================================================
  SCENE 04 — APP HEAL: CRUD Pagination Offset Bug (Heal Pass)
  Breaks:  TC-009, TC-005 (task listings returning empty)
  Files:   app/crud.py (get_tasks function)
  Heal:    APP_HEAL (heals by changing offset query logic back to skip)
  Jira:    Created and updated to "IN REVIEW"
  PR:      Created automatically (links Jira key to branch, commits, and title)
================================================================================

What breaks:
  crud.py: query.offset(skip) changed to query.offset(limit)
  Effect:  Retrieving task list skips elements incorrectly, returning empty lists.

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/04_heal_app_crud_pagination.sh

  git commit -am "demo: trigger Scene 04" && git push origin main


================================================================================
  SCENE 05 — APP HEAL: Business Logic Gate (Heal Pass)
  Breaks:  TC-106 (subtask validation check failed)
  Files:   app/routers/tasks.py (update_task function)
  Heal:    APP_HEAL (heals by restoring subtask state checking rule)
  Jira:    Created and updated to "IN REVIEW"
  PR:      Created automatically (links Jira key to branch, commits, and title)
================================================================================

What breaks:
  tasks.py: "not in (DONE, CANCELLED)" changed to "in (DONE, CANCELLED)"
  Effect:   Parent tasks are wrongly allowed to complete while subtasks are open,
            but get blocked when subtasks are actually closed.

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/05_heal_app_subtask_gate.sh

  git commit -am "demo: trigger Scene 05" && git push origin main


================================================================================
  SCENE 06 — MIXED COMBO: Test and App Errors (Heal Pass Combo) ⭐ BEST FOR DEMO
  Breaks:  TC-030, TC-037 (tests) + users.py + crud.py (app)
  Heal:    MIXED (TEST_HEAL + APP_HEAL resolved concurrently in one loop)
  Jira:    Created and updated to "IN REVIEW"
  PR:      Created automatically containing both fixes in a single branch
================================================================================

What breaks (4 things):
  1. TC-030: wrong enum string "in-progress" (test file assertion error)
  2. TC-037: wrong threshold > 100 (test file assertion error)
  3. users.py: inverted email validation check for "alice@test.com" (app router bug)
  4. crud.py: offset(limit) instead of offset(skip) (app database queries bug)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/06_heal_mixed_combo.sh

  git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests commit -am "demo: sync tests" && git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests push origin main || true
  git commit -am "demo: trigger Scene 06" && git push origin main


================================================================================
  SCENE 07 — ENV ISSUE: Broken Database Connection (Heal Fail)
  Breaks:  TC-001 to TC-011 (all integration task tests)
  Files:   tests/integration/test_api_tasks.py
  Heal:    NONE (ENV_ISSUE — AI identifies as environment problem, skips healing)
  Jira:    Created and left in "TODO" status
  PR:      Skipped (NOT created)
================================================================================

What breaks:
  test_api_tasks.py: SQLite DB URL replaced with nonexistent host postgres host
  Effect:  Database connections fail immediately with operational error.

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/07_fail_env_broken_db.sh

  git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests commit -am "demo: sync tests" && git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests push origin main || true
  git commit -am "demo: trigger Scene 07" && git push origin main


================================================================================
  SCENE 08 — SCHEMA BREAK: DB Schema Mismatch (Heal Fail)
  Breaks:  TC-103 (task creation crashes due to due_date model column renamed)
  Files:   app/models.py
  Heal:    NONE (AI attempts healing app code, but database schema requires migration)
  Jira:    Created and left in "TODO" status
  PR:      Skipped (NOT created because validation fails)
================================================================================

What breaks:
  models.py: Task.due_date column renamed to Task.task_due_date
  Effect:  Task creation with due_date fails validation/database mapping.

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/08_fail_schema_mismatch.sh

  git commit -am "demo: trigger Scene 08" && git push origin main


================================================================================
  SCENE 09 — COMBO FAIL: Multiple Unhealed Failures (Heal Fail Combo)
  Breaks:  test_api_tasks.py (ENV) + models.py (schema)
  Heal:    NONE for both (AI skips ENV and fails healing schema change)
  Jira:    Created tickets for all failures and left in "TODO"
  PR:      Skipped (NOT created)
================================================================================

What breaks (2 things):
  1. test_api_tasks.py: broken PostgreSQL URL (ENV_ISSUE)
  2. models.py: Task.due_date column renamed (APP_BUG — healing fails validation)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/09_fail_mixed_combo.sh

  git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests commit -am "demo: sync tests" && git -C /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests push origin main || true
  git commit -am "demo: trigger Scene 09" && git push origin main


================================================================================
  SUMMARY TABLE
================================================================================

  Step | Script                         | Outcome Type | Heal Type  | Jira Status | PR Link?
  -----|────────────────────────────────|──────────────|────────────|─────────────|─────────
  01   | 01_pass_baseline_green.sh      | PASS         | NONE       | —           | —
  02   | 02_heal_test_assertions.sh     | HEAL         | TEST_HEAL  | IN REVIEW   | Yes
  03   | 03_heal_app_inverted_logic.sh  | HEAL         | APP_HEAL   | IN REVIEW   | Yes
  04   | 04_heal_app_crud_pagination.sh | HEAL         | APP_HEAL   | IN REVIEW   | Yes
  05   | 05_heal_app_subtask_gate.sh    | HEAL         | APP_HEAL   | IN REVIEW   | Yes
  06   | 06_heal_mixed_combo.sh         | HEAL         | MIXED      | IN REVIEW   | Yes
  07   | 07_fail_env_broken_db.sh       | FAIL         | ENV_ISSUE  | TODO        | No
  08   | 08_fail_schema_mismatch.sh     | FAIL         | APP_BUG    | TODO        | No
  09   | 09_fail_mixed_combo.sh         | FAIL         | MIXED      | TODO        | No


================================================================================
  RESET (use between EVERY scene)
================================================================================

  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh

================================================================================
