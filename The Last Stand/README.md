# The Last Stand — project entry point

> **Current project memory:** this file's original checkpoint roadmap is historical and no longer reflects implementation. Start with [`docs/project/PROJECT_STATE.md`](docs/project/PROJECT_STATE.md), then [`docs/project/DECISIONS.md`](docs/project/DECISIONS.md), [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md), and the owner-approved V1 Specification Revision 2. The current Revision 2 copy is not yet stored in this repository; see Project State. `Development/SPEC.md` is an older v0.1 draft.

## Current workspace

- [Project state](docs/project/PROJECT_STATE.md)
- [Decision register](docs/project/DECISIONS.md)
- [Full development history](docs/project/DEVELOPMENT_HISTORY.md)
- [Claude's original handoff (historical, preserved)](docs/project/HANDOFF_CLAUDE.md)
- [Production architecture](docs/architecture/ARCHITECTURE.md)
- [Agent working agreement](AGENTS.md)

---

## Historical Checkpoint 0 README (2026-11-04)

The Last Stand is a chess game with an optional battle story around the match.
The first goal is a serious, complete, enjoyable chess game. Attacker and
defender roles, cinematic introductions, battlefields, characters, dialogue,
and effects can make matches feel like battles while the chess rules remain
clear and unchanged.

## Product principles

- Chess is the foundation: the board, rules, turns, and match outcome must be
  understandable and playable without the battle presentation.
- Storytelling is optional and must never block, obscure, or change chess play.
- Creative direction stays flexible while the project is small and being
  explored.
- Work proceeds in checkpoints. Each checkpoint has a clear goal, review, and
  recorded outcome before the next begins.

## Roadmap

This is a working plan, not a fixed commitment. Checkpoints may be refined as
we learn more about the project and its constraints.

| Checkpoint | Focus | Status |
| --- | --- | --- |
| 0 | Project foundation and workflow | In progress |
| 1 | Chessboard, pieces, movement, and interaction | Not started |
| 2 | Complete chess rules, including check, checkmate, castling, and promotion | Not started |
| 3 | First complete playable match and core interface | Not started |
| 4 | Contextual character reactions and dialogue | Not started |
| 5 | Optional attacker/defender framing, battlefields, and introductions | Not started |
| 6 | Animation, sound, effects, and storytelling polish | Not started |
| 7 | Opponent options, settings, and further game modes | Not started |

See [Development/CHECKPOINTS.md](Development/CHECKPOINTS.md) for checkpoint
goals and [Development/DEVELOPMENT_LOG.md](Development/DEVELOPMENT_LOG.md) for
the decision and progress history.

## Project layout

- `Game/` — future game implementation; no technology stack has been selected.
- `Design/` — future product, interaction, and creative direction notes.
- `Development/` — checkpoint tracking and development history.
- `References/` — source material and inspiration, when needed.

## Technology and setup

No technology stack or build workflow has been selected. Check the existing
workspace and project needs before recommending one. Record the reasoning and
trade-offs before adopting it. Until then, there are no install or run steps.
