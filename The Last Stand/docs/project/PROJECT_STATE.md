# The Last Stand — Project State

**Last updated:** 2026-11-08
**Status:** M1–M3.2 implemented and accepted for their documented scopes. No later milestone is authorized or in progress.

## Start here

The Last Stand is a serious, fully playable chess game first, enhanced by optional battle framing and storytelling. Narrative, animation, sound, and Chronicle must never alter chess rules, authoritative state, move acceptance, or results.

Read this file first, then [decisions](DECISIONS.md), the relevant [development history](DEVELOPMENT_HISTORY.md), [architecture](../architecture/ARCHITECTURE.md), and the owner-approved V1 Specification Revision 2. The current Revision 2 copy was supplied outside the repository and is not checked in. The in-repository [`Development/SPEC.md`](../../Development/SPEC.md) is an older v0.1 draft and is not authoritative.

## Current implementation

| Milestone | State | Verified scope |
|---|---|---|
| M1 — engine foundation | **Complete, accepted** | Immutable ordinary move engine, king safety, structured move results, FEN, and validation. |
| M2.1 — castling | **Complete, accepted** | All four castles, rights, attacks, and rook identity-relevant canonical facts. |
| M2.2 — en passant | **Complete, accepted** | Legal capture, actual victim square, discovered-check handling, and FEN metadata. |
| M2.3 — promotion | **Complete, accepted** | Four explicit choices, quiet/capture promotion, immutable pawn identity at the engine boundary. |
| M2.4 — regression/perft hardening | **Accepted for documented scope** | Six published fixtures verified through depth 3. Depth 4 and deeper were not run. |
| M3.1 — Match foundation | **Complete, accepted** | Stable piece IDs, immutable move events, captures, and deterministic replay. |
| M3.2 — draw rules and adjudication | **Complete, accepted** | Match-owned repetition history, claims, automatic repetition/move-count draws, stalemate/checkmate, event replay verification, and explicit unimplemented dead-position interface. |

No M3.3 implementation is underway or authorized. The immediate next work is a bounded technical/design preparation for complete dead-position detection, including the formal rules model, frozen experiment corpus, performance and `UNDETERMINED` policy evidence. The owner must authorize implementation scope after reviewing that preparation.

## Architecture in force

- TypeScript, Vite, Vitest, browser-native UI; no React or game engine currently.
- Runtime dependency-free chess engine; Node and Chromium tests.
- Engine owns immutable `RuleState` and chess rule calculations. Match owns identities, authoritative events, actual repetition history, claims/results, and replay.
- Match supplies position history explicitly to pure engine draw evaluation. Repetition context is **not** owned by `RuleState` and is never inferred from FEN.
- Narrative Resolver, presentation/queues, UI, audio, cinematic, AI, and multiplayer are not implemented.
- Both original prototype copies remain read-only. Their recorded hashes and locations are in [architecture](../architecture/ARCHITECTURE.md).

## Required V1 work still outstanding

- **Complete dead-position detection is mandatory before V1 can be called fully standard-rules complete.** Current `assessMatingPotential` returns `undetermined / NOT_IMPLEMENTED`; it must never guess `DEAD` or `LIVE`. No material-only shortcut is acceptable.
- Narrative Resolver and deterministic, versioned reaction records.
- Text presentation and completion queue, including grouping, persistence, and result-screen behavior.
- Opening cinematic integration, UI, and minimal text Chronicle.
- AI comes after the verified local engine/API. Online multiplayer is deferred to V1.5 or later.

Approved but still awaiting implementation includes the owner-approved product decisions in [DECISIONS.md](DECISIONS.md), including reaction tiers, Quick Play/Cinematic, Chronicle, and contribution-based dialogue.

## Risks and unresolved owner choices

- Dead-position computation can be expensive; `UNDETERMINED` handling is an open owner decision after Experiment 3. The detector must evaluate each side separately and only return `DEAD` with sound proof.
- Classification thresholds, grouping policy P1/P2, text placement, dismissal completion, minimum readable duration, animation triggers, and Chronicle perspective choice remain open as listed in [DECISIONS.md](DECISIONS.md).
- Full perft verification beyond depth 3 is absent from the accepted M2.4 evidence.
- The supplied Revision 2 spec has a stale “Draft for Owner Approval” footer despite later owner approval. The owner’s later approval governs; the file itself has not been edited. The current spec copy is outside this repository and should be added by the owner when ready for shared repository access.

## Repository and Git caveat

The working directory is `D:\Development\The Last Stand`, while Git metadata is at `D:\Development\.git`; Git reports this directory as the worktree root. Scoped status reports the old nested `The Last Stand/...` paths as deleted and the current root-level files as untracked. This appears to be a repository-layout/index discrepancy. It was inspected but not repaired; do not stage, commit, push, or alter Git history. The owner handles all Git operations.

## Immediate next steps

1. Owner reviews this memory set and decides where to place the authoritative Revision 2 spec in the repository.
2. Prepare the dead-position research spike without weakening the standard-rules requirement; settle corpus, oracle, budgets, measurements, and fallback policy for `UNDETERMINED`.
3. Owner authorizes a concrete next implementation milestone.

## Evidence links

- [Full milestone and research history](DEVELOPMENT_HISTORY.md)
- [Owner-approved decisions and open items](DECISIONS.md)
- [Claude's preserved historical handoff](HANDOFF_CLAUDE.md)
- [Current production architecture](../architecture/ARCHITECTURE.md)
