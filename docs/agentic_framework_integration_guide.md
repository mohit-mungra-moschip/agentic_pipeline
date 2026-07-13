# AI Self-Healing Regression Framework Integration Guide

This guide provides a step-by-step walkthrough for porting the `RegressionAI` self-healing automation framework from this repository into any other Python-based software project.

---

## 🏗️ 1. Architecture Overview

The self-healing framework works by capturing test failures, feeding them into a LangGraph state graph, using an LLM to analyze the source code and classify the failures, applying code fixes, and then syncing the results to GitHub Pull Requests and Jira.

```mermaid
graph TD
    pytest[pytest Run] --> conftest[conftest.py Hook]
    conftest --> log[Write Test Failures to Logs]
    log --> runner[regression_runner.py]
    runner --> graph[LangGraph State Machine]
    
    subgraph LangGraph AI Nodes
        graph --> N2[Parse Failures]
        N2 --> N3[Fetch Code Files]
        N3 --> N4[LLM Failure Analysis]
        N4 --> N5[Git Blame Root Cause]
        N5 --> N6[LLM Code Self-Healing]
        N6 --> N7[Action Recommendations]
        N7 --> N8[Jira Ticket Sync]
    end
    
    N6 --> rerun[Re-run tests to Validate]
    rerun -- Pass --> PR[Create Pull Request]
    rerun -- Fail --> JiraTODO[Create Jira Bug Ticket]
```

---

## 🚀 2. Step-by-Step Integration

Follow these steps to integrate the self-healing pipeline into your new project.

### Step 1: Copy Core Framework Files
Copy the following files and folders from the test repository into your new repository's testing directory (e.g., `tests/` or root):

```text
├── RegressionAI/             # Core LangGraph agent architecture
│   ├── agents/               # 8 Agent nodes (Test runner, failure parse, healing, Jira, etc.)
│   ├── skills/               # Helper utilities and tools
│   ├── graph.py              # LangGraph compilation
│   └── state.py              # Pipeline state definition
├── common_utils/             # Token tracking & utility functions
├── utils/                    # Mailer, Report Excel, and Jira helper scripts
├── config.py                 # Global configurations
├── conftest.py               # Pytest hooks for failure capture & metadata extraction
├── regression_runner.py      # Entry point script that orchestrates the flow
└── requirements.txt          # Python dependencies
```

### Step 2: Install Python Dependencies
Install the required dependencies in your new project's environment:
```bash
pip install -r requirements.txt
```
*Key dependencies include: `langgraph`, `langchain-core`, `langchain-google-genai`, `pytest`, `openpyxl`, `jira`, `click`, `rich`, `python-dotenv`.*

### Step 3: Configure Environment Variables
Set up your `.env` file in the root of the project with the following keys:

```ini
# LLM Provider Key (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub Integration
GITHUB_TOKEN=your_github_token_here
TEST_REPO_TOKEN=your_cross_repo_token_here (if using separate QA repo)

# Jira Integration
JIRA_SERVER=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@domain.com
JIRA_PASSWORD=your_jira_api_token_here
CREATE_JIRA=true # Set to false to disable ticket creation
```

---

## 📝 3. Pytest Formatting Requirements

For the agents to extract metadata (Test Case Name, Steps, and Expected Output) for Jira tickets and reports, your test cases must follow a standardized docstring structure.

### Standard Test Case Docstring Template:
```python
@pytest.mark.testid("TC-101")
def test_user_registration():
    """
    Description: Verifies that a new user can successfully register with valid details.
    Steps:
      1. Send POST request to /users with a unique email and password.
      2. Verify that the response status code is 201 Created.
      3. Verify that the user is persisted in the database.
    Expected Output: User is successfully created and active in the database.
    """
    # Test implementation goes here...
```

*Note: `conftest.py` uses regular expressions to parse `Description:`, `Steps:`, and `Expected Output:` out of the docstring. If these labels are missing, the report and Jira tickets will fallback to generic descriptions.*

---

## ⚙️ 4. Key Configuration Adjustments

To adapt the framework to your project, modify the following files:

### A. Adjust `config.py` (Jira & Board Settings)
Update these lines to point to your target Jira board, project key, and sprint names:
```python
JIRA_SERVER = os.getenv("JIRA_SERVER", "https://your-domain.atlassian.net")
JIRA_USERNAME = os.getenv("JIRA_USERNAME", "your-email@domain.com")
JIRA_PROJECT_KEY = "PROJ"         # Your Jira Project Key
JIRA_BOARD_NAME = "Project Board"  # Your Jira Board Name
JIRA_SPRINT_NAME = "Sprint 1"      # Your current active sprint
```

### B. Adjust `regression_runner.py` (Pytest command)
If you run tests in a different way (e.g. using specific markers or path names), change the default value of the `--test-command` click option in `regression_runner.py`:
```python
@click.option("--test-command", "-c", default="pytest tests/ -v --tb=short --junitxml=logs/test-results.xml")
```

### C. Adjust Agent Paths in `RegressionAI/skills/code_editors.py`
If your application files or test files are in different directories (e.g. `src/` instead of `app/` or `tests/`), update the directory search paths in `node_3_fetch_files.py` and `node_6_self_healing.py` so the LLM can find and edit them.

---

## 🔀 5. CI/CD Orchestration (GitHub Actions)

Copy and adapt `.github/workflows/regression.yml` to trigger the pipeline automatically when code is pushed or a test suite fails. 

The workflow needs to:
1. Run `pytest` and output logs to `logs/test-results.xml` and `reports/raw_output.txt`.
2. Run the `regression_runner.py` entrypoint.
3. Check the `healing_type` output from the runner:
   - If `APP_HEAL` or `MIXED`: Checkout a new branch `ai-fix/app-${run_id}`, apply the healed app code, and open a Pull Request.
   - If `TEST_HEAL` or `MIXED`: Checkout a new branch `ai-fix/test-${run_id}` in the tests repository, apply the healed test assertions, and open a Pull Request.

### GitHub Action Workflow Structure (Excerpt):
```yaml
- name: Run Pytest
  run: |
    pytest tests/ -v --tb=short --junitxml=logs/test-results.xml > reports/raw_output.txt || true

- name: Run RegressionAI Pipeline
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    JIRA_PASSWORD: ${{ secrets.JIRA_PASSWORD }}
  run: |
    python regression_runner.py --ci-mode --create-jira true

- name: Create Dev Pull Request (if APP healed)
  if: env.HEALING_TYPE == 'APP_HEAL' || env.HEALING_TYPE == 'MIXED'
  run: |
    git checkout -b ai-fix/app-${{ github.run_id }}
    git add app/
    git commit -m "AI: self-healed application bugs"
    git push origin ai-fix/app-${{ github.run_id }}
    gh pr create --title "AI Self-Healing: Fix application bugs" --body-file reports/pr_body.md
```

---

## ✅ 6. Integration Verification Checklist

To verify that your integration is successful:
- [ ] Run `pytest` locally to confirm `logs/test-results.xml` is generated with `conftest.py` active.
- [ ] Artificially break a test assertion (e.g. change an expected response string) and run:
  ```bash
  python regression_runner.py --ci-mode --create-jira false
  ```
- [ ] Check `reports/` for:
  - `ai_summary.json` containing the failure details and LLM classification.
  - An HTML report showing the failure under the healed/unhealed classification.
  - A spreadsheet Excel file containing the mapped failure details.
- [ ] Verify that the file was automatically repaired on disk.
