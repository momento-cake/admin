#!/bin/bash

# Cleanup Execution Script
# Removes worktrees and temporary files from failed/aborted executions

set -e

if [ $# -ne 1 ]; then
  echo "Usage: cleanup_execution.sh <branch_name>"
  exit 1
fi

BRANCH_NAME="$1"
WORKTREE_PATH=".worktrees/$BRANCH_NAME"

echo "Cleaning up execution environment..."
echo ""

# Remove worktree if exists
if [ -d "$WORKTREE_PATH" ]; then
  echo "Removing worktree: $WORKTREE_PATH"
  git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
  echo "✓ Worktree removed"
else
  echo "⚠️  Worktree not found: $WORKTREE_PATH"
fi

# Remove branch if exists (ask for confirmation)
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo ""
  read -p "Delete branch '$BRANCH_NAME'? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git branch -D "$BRANCH_NAME"
    echo "✓ Branch deleted"
  else
    echo "⚠️  Branch kept: $BRANCH_NAME"
  fi
else
  echo "⚠️  Branch not found: $BRANCH_NAME"
fi

# Clean up logs
if [ -d "logs/execution" ]; then
  echo ""
  read -p "Remove execution logs? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf logs/execution/*
    echo "✓ Execution logs removed"
  else
    echo "⚠️  Execution logs kept"
  fi
fi

echo ""
echo "✓ Cleanup complete"
