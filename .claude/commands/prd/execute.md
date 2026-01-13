# Execute

Orchestrate multi-phase execution by spawning fresh Claude sessions for each phase.

## Variables

- `scope`: $ARGUMENT (scope name or path to ai-handoff.json)

## Prerequisites

- Run `/plan` first to create PRD and ai-handoff.json
- Configure bash timeout in `~/.claude/settings.json`:
```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "5400000",
    "BASH_MAX_TIMEOUT_MS": "7200000"
  }
}
```
- Restart Claude Code after config change

## Process

### 1. Validate
```bash
bash .claude/commands/scripts/validate_prerequisites.sh "$ARGUMENT"
```

### 2. Choose Git Strategy
Ask user (AskUserQuestion):
- **Worktree** (recommended): Creates `.worktrees/{branch}` - keeps main clean
- **New branch**: Creates and switches to new branch
- **Current branch**: Works on current branch

### 3. Analyze Dependencies
```bash
python3 .claude/commands/scripts/analyze_dependencies.py "$HANDOFF_PATH" /tmp/execution_plan.json
```

### 4. Setup Git
Based on user choice:
```bash
# Worktree
mkdir -p .worktrees && git worktree add ".worktrees/$BRANCH" -b "$BRANCH"

# New branch
git checkout -b "$BRANCH"

# Current branch
# (just verify clean state)
```

### 5. Execute Phases
```bash
python3 .claude/commands/scripts/orchestrate_execution.py \
  "/tmp/execution_plan.json" \
  "$WORK_DIR" \
  "$PRD_PATH" \
  "logs/execution"
```

The orchestrator:
- Spawns fresh Claude session per phase
- Monitors with 60-second heartbeat
- Handles parallel execution for independent phases
- Times out after 90 minutes per phase

### 6. Final Validation
```bash
npm run build
npm run lint
npm run test
```

### 7. Commit & PR
```bash
git add .
git commit -m "Complete implementation of $SCOPE"
git push -u origin "$BRANCH"
gh pr create --title "$SCOPE" --body "..."
```

## Example

```bash
# After running /plan
/execute product-export

# Or with full path
/execute context/specs/product-export/ai-handoff.json
```

## Duration

Expect 30-90 minutes depending on number of phases. The heartbeat keeps the session active.

## Troubleshooting

**Timeout**: Configure bash timeout and restart Claude Code

**Phase failure**: Check `logs/execution/phase-X.log`

**Cleanup worktree**:
```bash
bash .claude/commands/scripts/cleanup_execution.sh branch-name
```
