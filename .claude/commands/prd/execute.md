# Execute AI Handoff Implementation

Orchestrate sequential and parallel execution of AI handoff phases by spawning fresh Claude sessions, managing git branches/worktrees, and creating a pull request with all changes.

## Purpose

Execute structured AI handoff phases automatically by:
1. Loading phase data from `ai-handoff.json`
2. **Asking user for branch strategy** (worktree, new branch, or current branch)
3. Setting up git environment based on user choice
4. Spawning fresh Claude sessions for each phase with handoff prompt
5. Running phases sequentially or in parallel based on dependencies
6. Continuous orchestration with heartbeat monitoring
7. Creating pull request after all phases complete

## Variables

- `scope`: $ARGUMENT (required: scope name, e.g., "offline-photos" or full path "context/specs/offline-photos/ai-handoff.json")

## Execution Strategy

**Automated Orchestration**:
- Parse `ai-handoff.json` for phase definitions and dependencies
- **Ask user for branch strategy** (worktree/new branch/current branch)
- Create worktree OR switch to new branch OR use current branch based on choice
- Execute phases in dependency order (sequential or parallel)
- Each phase spawns fresh Claude process with handoff prompt directly
- Orchestrator monitors with 60-second heartbeat to prevent timeout
- Background execution with PID tracking and active polling
- Accumulate all changes in chosen git environment
- Run tests and create PR after completion

**Key Features**:
- **Fresh Context**: Each phase gets new Claude session to avoid context exhaustion
- **Flexible Git Strategy**: User chooses between worktree, new branch, or current branch
- **Dependency-Based Execution**: Phases execute sequentially or in parallel based on dependencies
- **Heartbeat Monitoring**: 60-second progress updates prevent bash timeout
- **Direct Prompt Execution**: Handoff prompts sent directly to Claude (no `/implement` wrapper)
- **Fully Automated**: Minimal user interaction required during execution

## Prerequisites

- AI handoff file exists: `context/specs/{SCOPE}/ai-handoff.json`
- PRD file exists: `context/specs/{SCOPE}/PRD.md`
- Git repository clean (no uncommitted changes) - OR user chooses current branch
- Expect 30-90 minutes execution time (keep session active)

### ⚠️ REQUIRED: Bash Timeout Configuration

The orchestrator runs for 30-90 minutes. You **must** configure Claude Code bash timeout:

**Edit `~/.claude/settings.json`**:
```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "5400000",
    "BASH_MAX_TIMEOUT_MS": "7200000"
  }
}
```

Then **restart Claude Code** completely.

**Explanation**:
- `BASH_DEFAULT_TIMEOUT_MS`: 5,400,000ms = 90 minutes (matches max phase duration)
- `BASH_MAX_TIMEOUT_MS`: 7,200,000ms = 120 minutes (buffer for multiple phases)

## Instructions

**🚨 CRITICAL ORCHESTRATION BEHAVIOR**:

This command orchestrates long-running Claude sessions that each take 10-30 minutes. The orchestration uses **heartbeat monitoring** to prevent bash timeouts:

1. **60-second heartbeat**: Every 60 seconds, the orchestrator outputs a progress message to keep bash active
2. **Active monitoring**: The orchestrator continuously checks if spawned processes are still running
3. **Expected total runtime**: 30-90 minutes depending on number of phases
4. **The orchestrator remains active**: This Claude session stays alive throughout, monitoring phase completions
5. **Background + polling**: Phases run in background with PID tracking and active heartbeat loop

**Heartbeat Output Pattern**:
```
⏱️  Phase 1 still running... (5m elapsed) - 14:32:15
   Last activity: Writing test for ProductService...
⏱️  Phase 1 still running... (6m elapsed) - 14:33:15
   Last activity: Implementing ProductService...
⏱️  Phase 1 still running... (7m elapsed) - 14:34:15
   Last activity: Running tests...
```

**Why this approach**:
- Prevents bash from auto-backgrounding due to inactivity
- Provides real-time progress visibility
- Shows elapsed time and last log activity
- Keeps session responsive without user intervention

**Signal Handling & Process Management**:

The Python orchestrator includes robust signal handling to ensure clean shutdown:

1. **SIGTERM/SIGINT handlers**: Catches Ctrl+C and bash timeouts
2. **Process groups**: Child processes run in separate groups via `os.setsid`
3. **Graceful termination**: Kills entire process tree (including tests/builds)
4. **No orphaned processes**: All spawned Claude sessions properly cleaned up

This ensures that if you cancel execution (Ctrl+C) or bash times out, all child processes are terminated gracefully.

---

### Phase 0: Validation & Setup

**0.1 Resolve Paths and Validate**

Execute validation script:
```bash
bash .claude/commands/scripts/validate_prerequisites.sh "$ARGUMENT"
```

This script handles:
- Path resolution (scope name or full path)
- AI handoff JSON validation
- PRD existence check
- Git status verification

**Output**: Sets environment variables for use in subsequent phases:
- `SCOPE` - Scope name
- `HANDOFF_PATH` - Path to ai-handoff.json
- `PRD_PATH` - Path to PRD.md

**0.2 Ask for Git Strategy**

Use `AskUserQuestion` tool:
- Question: "How should git branches be managed for this implementation?"
- Header: "Git Strategy"
- Options:
  - **Use worktree** (recommended for clean separation): "Create a new worktree in .worktrees/ directory - keeps main codebase untouched"
  - **Create new branch**: "Create and switch to new branch from current location"
  - **Use current branch**: "Work on current branch (ensure clean working tree first)"
- MultiSelect: false

**0.3 Ask for Branch Name** (if worktree or new branch chosen)

Use `AskUserQuestion` tool:
- Question: "What branch name should be used for this implementation?"
- Header: "Branch Name"
- Suggest: `{scope-lowercase}-{description}`
- Format: lowercase, hyphens, no spaces
- Example: `offline-product-photos-sync`

### Phase 1: Parse Dependencies & Plan Execution

**1.1 Load and Analyze Phases**

```bash
# Load phases from JSON
PHASES=$(jq -c '.phases[]' "$HANDOFF_PATH")
NUM_PHASES=$(jq '.phases | length' "$HANDOFF_PATH")

echo "Loaded $NUM_PHASES phases from ai-handoff.json"
jq -r '.phases[] | "  Phase \(.number): \(.name) (deps: \(.dependencies | @json))"' "$HANDOFF_PATH"
```

**1.2 Build Execution Plan**

Use `.claude/commands/scripts/analyze_dependencies.py` to generate execution order:
```bash
python3 .claude/commands/scripts/analyze_dependencies.py "$HANDOFF_PATH" /tmp/execution_plan.json
```

Output shows execution groups (parallel phases grouped together).

**Note**: The script uses **explicit dependencies** from the `dependencies` field in ai-handoff.json.

### Phase 2: Setup Git Environment

**2.1 If User Chose: Worktree**
```bash
# Create worktrees directory
mkdir -p .worktrees

# Create feature branch worktree
git worktree add ".worktrees/$BRANCH_NAME" -b "$BRANCH_NAME"

# Verify creation
git worktree list | grep "$BRANCH_NAME"
echo "✓ Worktree created: .worktrees/$BRANCH_NAME"

# Set working directory for phases
WORK_DIR="$(pwd)/.worktrees/$BRANCH_NAME"
```

**2.2 If User Chose: New Branch**
```bash
# Create and switch to new branch
git checkout -b "$BRANCH_NAME"

# Verify branch creation
git branch --show-current
echo "✓ New branch created: $BRANCH_NAME"

# Set working directory for phases
WORK_DIR="$(pwd)"
```

**2.3 If User Chose: Current Branch**
```bash
# Verify clean working tree (optional warning if dirty)
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: Working tree has uncommitted changes"
  echo "   Changes will be included in the implementation"
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "✓ Using current branch: $CURRENT_BRANCH"

# Set working directory for phases
WORK_DIR="$(pwd)"
```

### Phase 3: Execute Phases (Python Orchestrator)

**3.1 Why Python Orchestrator?**

The Python orchestrator (`orchestrate_execution.py`) solves bash timeout/hanging issues by:
- Using Python's `subprocess` with proper process management
- Real-time output streaming (no buffering)
- Heartbeat via background thread (not blocking polling)
- Proper signal handling and cleanup
- Better control over parallel execution

**3.2 Execution Command**

Use the Python orchestrator to execute all phases:

```bash
# Create logs directory
mkdir -p logs/execution

# Execute all phases using Python orchestrator
# This handles both sequential and parallel execution automatically

python3 .claude/commands/scripts/orchestrate_execution.py \
  "/tmp/execution_plan.json" \
  "$WORK_DIR" \
  "$PRD_PATH" \
  "logs/execution"

# Check exit code
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Phase execution failed"
  exit 1
fi

echo ""
echo "✅ All phases completed successfully"
```

**How the orchestrator works**:

1. **Loads execution plan**: Reads phases and execution groups from JSON
2. **For each group**:
   - If single phase → executes sequentially
   - If multiple phases → executes in parallel
3. **Phase execution**:
   - Spawns `claude` process with `/implement` wrapper
   - Streams output in real-time (line-buffered)
   - Updates status based on output patterns
   - Heartbeat thread outputs progress every 60s
   - Enforces 90-minute timeout
4. **Skip detection**: Automatically skips phases with manual work keywords
5. **Exit codes**: 0=success, 99=skip, 1+=failure

**Benefits over bash approach**:
- No bash timeout issues (Python subprocess management + Claude config)
- Real-time streaming output (no buffering)
- Better parallel execution (threading)
- Cleaner code and error handling
- Proper signal handling with process groups (no orphaned processes)
- Graceful cleanup on Ctrl+C or timeout

### Phase 4: Run Final Tests

```bash
cd "$WORK_DIR"

echo "Running final test suite..."

# Run unit tests
npm run test

if [ $? -ne 0 ]; then
  echo "ERROR: Unit tests failed"
  exit 1
fi

echo "✓ Unit tests passed"

# Run E2E tests (if they exist)
if [ -f "playwright.config.ts" ]; then
  npx playwright test

  if [ $? -ne 0 ]; then
    echo "ERROR: E2E tests failed"
    exit 1
  fi

  echo "✓ E2E tests passed"
fi

# Run linter
npm run lint

if [ $? -ne 0 ]; then
  echo "ERROR: Linting failed"
  exit 1
fi

echo "✓ Linting passed"

# Run type check
npm run build

if [ $? -ne 0 ]; then
  echo "ERROR: Build failed"
  exit 1
fi

echo "✓ Build successful"
echo "✓ Validation complete"

cd -
```

### Phase 5: Commit Changes

**5.1 If User Chose: Worktree or New Branch**
```bash
cd "$WORK_DIR"

# Stage all changes
git add .

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "⚠️  No changes to commit"
  exit 0
fi

# Create commit message
COMMIT_MSG=$(cat <<EOF
Complete implementation of $SCOPE

All phases completed:
$(jq -r '.phases[] | "- Phase \(.number): \(.name)"' "$HANDOFF_PATH")

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)

# Commit
git commit -m "$COMMIT_MSG"

echo "✓ Changes committed"

cd -
```

**5.2 If User Chose: Current Branch**
```bash
cd "$WORK_DIR"

# Stage all changes
git add .

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "⚠️  No changes to commit"
  exit 0
fi

# Create commit message
COMMIT_MSG=$(cat <<EOF
Complete implementation of $SCOPE

All phases completed:
$(jq -r '.phases[] | "- Phase \(.number): \(.name)"' "$HANDOFF_PATH")

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)

# Commit
git commit -m "$COMMIT_MSG"

echo "✓ Changes committed to current branch"

cd -
```

### Phase 6: Create Pull Request

**6.1 Generate PR Description**

```bash
# Extract metadata from PRD
SCOPE_TITLE=$(grep -m1 "^# " "$PRD_PATH" | sed 's/^# //')
TYPE=$(grep -oP '(?<=\*\*Type\*\*: `)[^`]+' "$PRD_PATH" || echo "feature")
COMPLEXITY=$(grep -oP '(?<=\*\*Complexity\*\*: `)[^`]+' "$PRD_PATH" || echo "medium")

# Create PR description
cat > /tmp/pr_description.md <<EOF
# $SCOPE: $SCOPE_TITLE

## Summary
Automated implementation of $NUM_PHASES phases from AI handoff specification.

## Implementation Phases
$(jq -r '.phases[] | "- **Phase \(.number)**: \(.name)"' "$HANDOFF_PATH")

## Testing
- [x] All unit tests passing
- [x] E2E tests passing (if applicable)
- [x] Linter clean
- [x] Build successful

## Changes
\`\`\`
$(cd "$WORK_DIR" && git diff develop --stat 2>/dev/null || git diff main --stat 2>/dev/null || echo "Changes made in current branch")
\`\`\`

## PRD Reference
Full specification: \`$PRD_PATH\`

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

**6.2 Create PR** (only if worktree or new branch)

```bash
# Only create PR if we're on a feature branch (not current branch)
if [ "$GIT_STRATEGY" != "current" ]; then
  cd "$WORK_DIR"

  # Push branch
  git push -u origin "$BRANCH_NAME"

  # Determine base branch
  BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

  # Create PR
  gh pr create \
    --base "$BASE_BRANCH" \
    --head "$BRANCH_NAME" \
    --title "$SCOPE: $SCOPE_TITLE" \
    --body "$(cat /tmp/pr_description.md)"

  PR_URL=$(gh pr view --json url -q .url)

  echo ""
  echo "========================================="
  echo "Pull Request Created!"
  echo "URL: $PR_URL"
  echo "========================================="

  cd -
else
  echo ""
  echo "========================================="
  echo "Implementation complete on current branch"
  echo "Create PR manually when ready:"
  echo "  gh pr create"
  echo "========================================="
fi
```

### Phase 7: Cleanup & Summary

```bash
echo ""
echo "Execution Summary:"
echo "- Scope: $SCOPE"
if [ "$GIT_STRATEGY" = "worktree" ]; then
  echo "- Git Strategy: Worktree"
  echo "- Worktree: .worktrees/$BRANCH_NAME"
  echo "- Branch: $BRANCH_NAME"
  echo "- To remove worktree after PR merge: git worktree remove .worktrees/$BRANCH_NAME"
elif [ "$GIT_STRATEGY" = "new_branch" ]; then
  echo "- Git Strategy: New Branch"
  echo "- Branch: $BRANCH_NAME"
elif [ "$GIT_STRATEGY" = "current" ]; then
  echo "- Git Strategy: Current Branch"
  CURRENT_BRANCH=$(git branch --show-current)
  echo "- Branch: $CURRENT_BRANCH"
fi
echo "- Phases: $NUM_PHASES completed"
if [ -n "$PR_URL" ]; then
  echo "- PR: $PR_URL"
fi
echo ""
```

## Error Handling

**Phase Failure**:
- Execution stops immediately on phase failure
- Error reported with exit code and log location
- No automatic recovery - manual intervention required

**Recovery Steps**:
```bash
# Option 1: If using worktree - fix in worktree and resume
cd .worktrees/$BRANCH_NAME
# Make fixes
git add .
git commit -m "Fix issues"
cd -

# Option 2: If using new branch - fix in branch
# Make fixes
git add .
git commit -m "Fix issues"

# Option 3: If using current branch - fix and commit
# Make fixes
git add .
git commit -m "Fix issues"

# Option 4: Cleanup and restart (if using worktree)
bash .claude/commands/scripts/cleanup_execution.sh "$BRANCH_NAME"
```

## Scripts Reference

All scripts located in `.claude/commands/scripts/`:

- `validate_prerequisites.sh` - Validates environment and prerequisites
- `analyze_dependencies.py` - Builds execution plan from dependencies
- `orchestrate_execution.py` - Python orchestrator for phase execution
- `cleanup_execution.sh` - Cleans up worktrees and temporary files (if using worktrees)

## Example Usage

```bash
# Simple usage - scope name only
/execute offline-product-photos

# Alternative - full path
/execute context/specs/offline-product-photos/ai-handoff.json

# Claude will:
# 1. Validate prerequisites
# 2. Ask for git strategy (worktree/new branch/current branch)
# 3. Ask for branch name (if applicable)
# 4. Load phases from ai-handoff.json
# 5. Analyze dependencies and build execution plan
# 6. Create worktree OR switch to new branch OR use current branch
# 7. Execute phases (sequential or parallel as needed)
# 8. Run final tests and validation
# 9. Commit all changes
# 10. Create pull request (if applicable)
# 11. Report summary
```

## Notes

**Advantages**:
- **Fresh Context**: Each phase runs in new Claude session (no context exhaustion)
- **Optimized Execution**: Parallel execution for independent phases
- **Flexible Git Strategy**: User chooses between worktree, new branch, or current branch
- **Direct Prompt Control**: Handoff prompts define exact behavior for each phase
- **Heartbeat Monitoring**: Prevents bash timeout with 60-second progress updates
- **Mostly Automated**: Minimal user interaction required

**Limitations**:
- Requires `claude` CLI with authentication
- API quota usage scales with number of phases
- Long execution time (30-90 minutes typical)

**When to Use**:
- Complex features with 4+ phases
- Features designed for parallel execution
- Large features spanning multiple architectural layers
- When context window management is critical

**Git Strategy Recommendations**:
- **Use worktree**: Best for clean separation, especially for long-running features or when you need to work on other tasks
- **Use new branch**: Good for standard feature development, simpler than worktrees
- **Use current branch**: Quick iteration on small features or when already on a feature branch
