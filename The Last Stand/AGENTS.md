# The Last Stand — Agent Working Agreement

## Required context at the start of every new session

Before planning or changing project files, read:

1. [`docs/project/PROJECT_STATE.md`](docs/project/PROJECT_STATE.md)
2. [`docs/project/DECISIONS.md`](docs/project/DECISIONS.md)
3. Relevant sections of [`docs/project/DEVELOPMENT_HISTORY.md`](docs/project/DEVELOPMENT_HISTORY.md)
4. [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)
5. The owner-approved V1 Specification, Revision 2 (the checked-in `Development/SPEC.md` is an older v0.1 draft, not the current authority). If Revision 2 is not available in the repository or current task attachments, ask the owner to provide it; do not substitute an older draft.

The project state names the current milestone and active constraints. This file sets collaboration rules. The current approved specification governs product scope; architecture documentation describes implemented technical boundaries. Historical handoffs are evidence and context, not automatic authority.

## Working rules

- The owner has final authority. Preserve approved decisions unless concrete evidence shows a contradiction; explain the evidence and trade-offs before proposing a change.
- Challenge technical proposals with evidence. After one round of unresolved disagreement, present the owner with the options, risks, and a recommendation.
- Roles: Codex implements and verifies; Claude reviews architecture/specifications and provides independent technical scrutiny; ChatGPT coordinates, consolidates, and handles creative work. The owner relays material between agents.
- Keep one active writer per file. Coordinate before overlapping edits.
- Do not claim work is complete without the required verification. Never invent test results, dates, decisions, or implementation facts.
- Preserve both original prototype copies. Treat them as read-only references.
- Do not commit or push. The owner handles all Git operations.
- Never put secrets or private personal information in the repository.
- After each owner-accepted milestone, update the canonical project memory: [`PROJECT_STATE.md`](docs/project/PROJECT_STATE.md), [`DEVELOPMENT_HISTORY.md`](docs/project/DEVELOPMENT_HISTORY.md), and [`DECISIONS.md`](docs/project/DECISIONS.md) as applicable.
- Keep implementation focused on the authorized milestone. No unapproved product or architecture changes.

## Resuming in a new chat

Read the required context above, then inspect the current workspace and scoped Git status. Use `PROJECT_STATE.md` for the latest verified state and next step; consult the relevant history entries and decision IDs for context. Compare any handoff with the current decisions and specification, preserving the handoff as historical material. If the task relies on a missing attachment, report that gap and continue only with independent work. Do not require the owner to paste the entire previous conversation.
