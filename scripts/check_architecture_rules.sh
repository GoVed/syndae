#!/usr/bin/env bash
set -euo pipefail

# Mechanical check for ARCHITECTURE_RULES.md (Laws 1 & 2)
# Ensures no tool-specific strings leak into src/agent or src/router in staged diff

echo "=== Checking Syndae Architectural Rules (Laws 1 & 2) ==="

# Get list of staged files in src/agent/ or src/router/
STAGED_AGENT_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^src/(agent|router)/' || true)

if [ -n "$STAGED_AGENT_FILES" ]; then
    echo "Inspecting staged agent/router files:"
    echo "$STAGED_AGENT_FILES"

    # Forbidden specific tool identifiers and channels that must never be hardcoded in the harness
    FORBIDDEN_PATTERNS='("send_message"|"send_sticker"|"send_image"|"send_gif"|"send_reaction"|"translate"|"search_stickers"|"download_sticker"|"whatsapp"|"baileys")'

    # Check additions in staged diff for forbidden patterns
    VIOLATIONS=$(git diff --cached -U0 $STAGED_AGENT_FILES | grep '^+' | grep -v '^+++' | grep -iE "$FORBIDDEN_PATTERNS" || true)

    if [ -n "$VIOLATIONS" ]; then
        echo ""
        echo "❌ ARCHITECTURE RULE VIOLATION DETECTED in staged changes!"
        echo "The following lines in src/agent/ or src/router/ introduce hardcoded tool/channel logic:"
        echo "--------------------------------------------------"
        echo "$VIOLATIONS"
        echo "--------------------------------------------------"
        echo "Per ARCHITECTURE_RULES.md Law 1 & Law 2, Syndae Core must remain a 100% pure harness."
        echo "Tool names, dialects, and channel protocols belong strictly in external tool repositories."
        echo "Commit aborted."
        exit 1
    fi
fi

echo "✅ Architectural integrity verified: No hardcoded tool/channel logic detected."
exit 0
