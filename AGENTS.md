# Syndae Agent Guidelines & Rules

All AI agents operating within the Syndae workspace MUST strictly comply with the architectural laws set forth in [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md).

## Critical Enforcement: Pre-Commit Architecture Auditor Subagent (Law 5)

Before executing ANY `git commit` in this repository:
1. **Spawn Architecture Auditor**: You MUST invoke an independent subagent using `invoke_subagent` with role `Architecture Auditor`.
   - Prompt the auditor to review `git diff --cached` (or `git diff HEAD`).
   - The auditor must verify compliance against Laws 1–4 in `ARCHITECTURE_RULES.md`:
     - **Law 1**: Core is a Pure Harness. Absolutely NO tool names, WhatsApp/email/telegram logic, dialect/language lists, or contact parsers in `src/agent/` or `src/router/`.
     - **Law 2**: Tools live exclusively in external packages (`../syndae_tools/`).
     - **Law 3**: Universal world-learning; zero hardcoded user profiles or relationship assumptions.
     - **Law 4**: ~300-350 LOC limits, 100% passing tests (`cargo test`).
2. **Obtain Explicit PASS**: You may ONLY commit after the auditor subagent returns `VERDICT: PASS`. If the auditor returns `VERDICT: FAIL`, you MUST fix all flagged violations before committing.

## Never Bypass
Never add quick-fix procedural heuristics into the harness to compensate for local model quirks. Always resolve tool behavior via MCP tool descriptions, schemas, or server-side fallbacks in external tool packages.
