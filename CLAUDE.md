# Read Before Coding

## Contextly
This is a RAG chatbot platform. See `.context/` for specifications and `AGENTS.md` for project-specific instructions.

## Must-Do Before Changes
1. Read `.context/` specs relevant to the change.
2. Read `AGENTS.md` in project root and `~/.config/opencode/AGENTS.md`.
3. Check `.claude/MEMORY.md` for current task state.
4. Update `IMPLEMENTATION_PLAN.md` checkboxes as work is completed.
5. Update `AGENTS.md` if behavior/architecture changes.

## Package Management
- Python backend deps: `uv` with venv in current directory.
- Frontend deps: `pnpm`.
- Never install directly to device.

## Code Style
- Minimal changes, match existing style.
- Keep business logic in services, FastAPI routes thin.
- Use type hints in Python, explicit types in TS where helpful.
- Always include `project_id` in DB WHERE clauses.
- Never store secrets in code.

## Subagents / Search
- Use named subagents when asked.
- Use semble MCP for codebase exploration first.
- Fall back to grep only for exhaustive literal matches.

## Git
- Do NOT commit, push, reset, rebase unless explicitly asked.
- Never use my name as committer/contributor.
