# SYNDAE ARCHITECTURAL RULES & CORE LAWS

## Law 1: Syndae Core is a Pure Harness
The Syndae repository (`Syndae/`) is strictly a general-purpose AI Operating System and execution harness.
- It contains ONLY:
  - Agent runtime, turn queue, reasoning / thinking loop.
  - Model management and local engine orchestration (vLLM, llama.cpp, Ollama).
  - Memory indexing (Tantivy BM25) and markdown file operations.
  - State database (SQLite) and configuration.
  - MCP client protocol (JSON-RPC) and generic HTTP inbound event gateway.
  - User interface (Chat, ModelManager, MemoryHub, ToolHub, Settings).
- It MUST NOT CONTAIN:
  - Any tool-specific service implementations, custom communication protocols, or third-party client drivers.
  - Any user-specific hardcoded names, personal identifiers, or profile assumptions.
  - Any language-specific, dialect-specific, or locale-specific hardcoded modules.
  - Any group-specific, topic-specific, or community-specific hardcoded logic.

## Law 2: Tools Live Exclusively in External Packages
- Tools are independent micro-daemons residing in external tool packages or standalone repositories.
- Tools communicate with Syndae strictly via:
  1. Standard MCP protocol (`tools/list`, `tools/call`).
  2. Generic HTTP inbound webhook (`POST /api/tools/trigger`).
- Syndae core remains 100% agnostic to what any external tool does. Syndae only processes standardized parameters: `protocol`, `channel_id`, `source_id`, `event_type`, `payload`.

## Law 3: Universal World-Learning Framework
- Every user has a completely distinct life, culture, language, family, and social circle.
- Syndae is built for millions of users worldwide and makes zero assumptions about who the user is.
- Syndae dynamically learns about each user's world and records it into `/memory/`:
  - `core/user_profile.md`: The user's identity, routines, languages, and general preferences.
  - `people/<contact_name>.md`: The user's relationship with that specific person, communication style, language, and shared history.
  - `groups/<group_name>.md`: The purpose behind the group, its dynamics, tone, and participants.
  - `dictionary/<topic>.md`: Slang, colloquial expressions, and vernacular shorthand used in their circles.
- The agent has full authority to save, enrich, and maintain these notes autonomously (`write_memory`).

## Law 4: Code Cleanliness & Constraints
- Maximum ~300-350 LOC per file. If a file grows, split cleanly into submodules.
- 100% test coverage preserved across unit, UI, and integration test suites.

## Law 5: Mandatory Pre-Commit Architecture Auditor Subagent
Before ANY git commit is executed in this repository:
1. **Mandatory Subagent Audit**: The primary agent MUST spawn an independent auditor subagent (`Architecture Auditor`) using `invoke_subagent`.
2. **Diff Inspection**: The auditor subagent must inspect the exact staged changes (`git diff --staged` / `git diff --cached`) against Laws 1, 2, 3, and 4:
   - **Zero Tool Leaks**: Verify that NO specific tool names (e.g. `send_message`, `send_sticker`, `translate`, `send_email`, `web_search`), tool protocols, or third-party client drivers have leaked into `src/agent/`, `src/router/`, or core harness modules.
   - **Zero Procedural Heuristics**: Verify that NO language/dialect heuristics, contact parsers, regex intent detectors, or forced `tool_choice` hacks exist.
   - **Pure ReAct Harness**: Verify Syndae remains a strictly generic ReAct harness (receives messages, passes MCP schemas, executes tool calls, returns tool results).
   - **Code Standards**: Verify file size limits (~300-350 LOC) and ensure all tests pass (`cargo test`).
3. **Formal Verdict**: The auditor subagent must deliver an explicit `VERDICT: PASS` or `VERDICT: FAIL` with line-by-line findings.
4. **Hard Gate**: Commits are strictly BLOCKED on `VERDICT: FAIL`. The commit may only proceed after a clean `VERDICT: PASS`.
