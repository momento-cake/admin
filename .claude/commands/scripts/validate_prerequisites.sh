#!/bin/bash

# Validate Prerequisites for /execute Command
# Validates environment and resolves scope paths

set -e

if [ $# -ne 1 ]; then
  echo "Usage: validate_prerequisites.sh <scope_or_path>"
  exit 1
fi

ARGUMENT="$1"

echo "Validating prerequisites..."
echo ""

# Resolve scope and paths
if [ -f "$ARGUMENT" ]; then
  # Full path provided
  HANDOFF_PATH="$ARGUMENT"
  SCOPE_DIR=$(dirname "$HANDOFF_PATH")
  SCOPE=$(basename "$SCOPE_DIR")
else
  # Scope name provided
  SCOPE="$ARGUMENT"
  SCOPE_DIR="context/specs/$SCOPE"
  HANDOFF_PATH="$SCOPE_DIR/ai-handoff.json"
fi

# Validate ai-handoff.json exists
if [ ! -f "$HANDOFF_PATH" ]; then
  echo "❌ ERROR: AI handoff file not found"
  echo "   Expected: $HANDOFF_PATH"
  echo ""
  echo "   Did you run /plan first?"
  echo "   Usage: /plan \"<scope-name>\" \"<description>\""
  exit 1
fi

# Validate JSON is parseable
if ! jq empty "$HANDOFF_PATH" 2>/dev/null; then
  echo "❌ ERROR: AI handoff file is not valid JSON"
  echo "   File: $HANDOFF_PATH"
  exit 1
fi

# Validate has phases
PHASE_COUNT=$(jq '.phases | length' "$HANDOFF_PATH")
if [ "$PHASE_COUNT" -eq 0 ]; then
  echo "❌ ERROR: AI handoff file has no phases"
  echo "   File: $HANDOFF_PATH"
  exit 1
fi

# Validate PRD exists
PRD_PATH="$SCOPE_DIR/PRD.md"
if [ ! -f "$PRD_PATH" ]; then
  echo "❌ ERROR: PRD file not found"
  echo "   Expected: $PRD_PATH"
  exit 1
fi

# Check git status (warning only, not error)
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: Working tree has uncommitted changes"
  echo "   This is OK if you chose 'current branch' option"
  echo ""
fi

echo "✓ Prerequisites validated"
echo ""
echo "Scope: $SCOPE"
echo "AI Handoff: $HANDOFF_PATH"
echo "PRD: $PRD_PATH"
echo "Phases: $PHASE_COUNT"
echo ""

# Export variables for use by calling script
export SCOPE="$SCOPE"
export HANDOFF_PATH="$HANDOFF_PATH"
export PRD_PATH="$PRD_PATH"
export PHASE_COUNT="$PHASE_COUNT"
