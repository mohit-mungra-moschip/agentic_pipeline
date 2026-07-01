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
  2. scene_X.sh             ← apply the break
  3. python3 regression_runner.py  ← trigger AI pipeline

Quick verify break before pipeline (optional):
  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 -m pytest tests/ --tb=line -q 2>&1 | tail -20


SCRIPTS LOCATION
────────────────
/home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/

  demo_reset.sh                    ← restores all files (git checkout)
  scene1_verify_green.sh           ← no breaks, baseline only
  scene2a_test_heal_assertions.sh  ← TEST HEAL: wrong assertion values
  scene2b_app_heal_inverted_logic.sh  ← APP HEAL: inverted email guard
  scene2c_app_heal_crud_pagination.sh ← APP HEAL: wrong pagination variable
  scene2d_app_heal_subtask_gate.sh    ← APP HEAL: subtask gate logic inverted
  scene2_combo_heal.sh             ← COMBO: 4 breaks at once (TEST + APP)
  scene3a_env_issue_broken_db.sh   ← CANNOT HEAL: broken DB URL (ENV_ISSUE)
  scene3b_app_heal_fail_schema_break.sh ← CANNOT HEAL: column rename
  scene3_combo_unhealed.sh         ← CANNOT HEAL: ENV + schema together


================================================================================
  SCENE 1 — All Green (Baseline)
  Expected: 100% pass, no healing, no Jira, no PR
================================================================================

bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh

cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
python3 regression_runner.py


================================================================================
  SCENE 2A — TEST HEAL: Assertion Bugs
  Breaks:  TC-030 (wrong enum string), TC-037 (wrong threshold)
  Files:   tests/unit/test_task_crud.py, tests/unit/test_user_model.py
  Heal:    TEST_HEAL
  Jira:    IN REVIEW
  PR:      Created
================================================================================

What breaks:
  TC-030: assert TaskStatus.IN_PROGRESS == "in-progress"  (hyphen bug)
  TC-037: assert len(user.name) > 100                     (wrong threshold)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene2a_test_heal_assertions.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 2B — APP HEAL: Inverted Email Guard Logic
  Breaks:  TC-012, TC-013, TC-015 (cascading)
  Files:   app/routers/users.py
  Heal:    APP_HEAL
  Jira:    IN REVIEW
  PR:      Created
================================================================================

What breaks:
  users.py: "if existing:" changed to "if not existing:"
  Effect:   ALL new user creation returns 409 (blocks everyone)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene2b_app_heal_inverted_logic.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 2C — APP HEAL: CRUD Pagination Bug
  Breaks:  TC-009, TC-005
  Files:   app/crud.py (get_tasks function)
  Heal:    APP_HEAL
  Jira:    IN REVIEW
  PR:      Created
================================================================================

What breaks:
  crud.py: query.offset(skip) changed to query.offset(limit)
  Effect:  All task list queries return [] (offset by 100 skips all rows)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene2c_app_heal_crud_pagination.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 2D — APP HEAL: Business Logic Bug (Subtask Gate)
  Breaks:  TC-106
  Files:   app/routers/tasks.py (update_task function)
  Heal:    APP_HEAL
  Jira:    IN REVIEW
  PR:      Created
================================================================================

What breaks:
  tasks.py: "not in (DONE, CANCELLED)" changed to "in (DONE, CANCELLED)"
  Effect:   Parent can complete with open subtasks; blocked when subtasks done

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene2d_app_heal_subtask_gate.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 2 COMBO — TEST HEAL + APP HEAL (4 breaks at once) ⭐ BEST FOR DEMO
  Breaks:  TC-030, TC-037 (tests) + users.py + crud.py (app)
  Heal:    MIXED (TEST_HEAL + APP_HEAL)
  Jira:    IN REVIEW
  PR:      Created (all fixes in one branch)
================================================================================

What breaks (4 things):
  1. TC-030: wrong enum string "in-progress"
  2. TC-037: wrong threshold > 100
  3. users.py: inverted email guard
  4. crud.py: offset(limit) instead of offset(skip)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene2_combo_heal.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 3A — CANNOT HEAL: ENV_ISSUE (Broken DB URL)
  Breaks:  TC-001 to TC-011 (all integration task tests)
  Files:   tests/integration/test_api_tasks.py
  Heal:    NONE (ENV_ISSUE — AI skips healing)
  Jira:    TODO
  PR:      NOT created
================================================================================

What breaks:
  test_api_tasks.py: SQLite URL replaced with nonexistent PostgreSQL host
  Effect:  All integration tests crash with connection refused / OperationalError

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene3a_env_issue_broken_db.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 3B — CANNOT HEAL: DB Schema Mismatch
  Breaks:  TC-001 (task creation crashes)
  Files:   app/models.py
  Heal:    NONE (healing attempted but fails verification)
  Jira:    TODO
  PR:      NOT created
================================================================================

What breaks:
  models.py: Task.title column renamed to Task.task_title
  Effect:  POST /api/tasks/ returns 500, schema/model mismatch

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene3b_app_heal_fail_schema_break.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SCENE 3 COMBO — Multiple Unhealed Failures
  Breaks:  test_api_tasks.py (ENV) + models.py (schema)
  Heal:    NONE for both
  Jira:    TODO (all tickets)
  PR:      NOT created
================================================================================

What breaks (2 things):
  1. test_api_tasks.py: broken PostgreSQL URL (ENV_ISSUE)
  2. models.py: column renamed (APP_BUG — healing fails)

Commands:
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh
  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/scene3_combo_unhealed.sh

  cd /home/mohit/OneDrive/All_Projects/agentic_pipeline_tests
  python3 regression_runner.py


================================================================================
  SUMMARY TABLE
================================================================================

  Scene      | Script              | Heal Type  | Jira      | PR
  -----------|---------------------|------------|-----------|----------
  1 Green    | (no script)         | NONE       | —         | —
  2A         | scene2a_...sh       | TEST_HEAL  | IN REVIEW | Yes
  2B         | scene2b_...sh       | APP_HEAL   | IN REVIEW | Yes
  2C         | scene2c_...sh       | APP_HEAL   | IN REVIEW | Yes
  2D         | scene2d_...sh       | APP_HEAL   | IN REVIEW | Yes
  2 COMBO ⭐ | scene2_combo_...sh  | MIXED      | IN REVIEW | Yes
  3A         | scene3a_...sh       | NONE       | TODO      | No
  3B         | scene3b_...sh       | NONE       | TODO      | No
  3 COMBO    | scene3_combo_...sh  | NONE       | TODO      | No


================================================================================
  RESET (use between EVERY scene)
================================================================================

  bash /home/mohit/OneDrive/All_Projects/agentic_pipeline/scripts/demo/demo_reset.sh

================================================================================
