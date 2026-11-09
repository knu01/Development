# The Last Stand — Project State

**Last updated:** 2026-11-09
**Status:** M1–M3.2 implemented and accepted for their documented scopes. M3.3 has experimental detector, pending Match, and replay progress; M3.3 remains open and is not accepted complete.

## Team ownership (owner-updated 2026-11-09)

- **Codex — Engineering Lead:** owns Engine/chess rules, Match/adjudication, dead-position detection, game state and authoritative events, AI/multiplayer logic, backend architecture and tests, performance, and correctness.
- **Claude — Frontend Lead:** owns frontend implementation, visual design, UI/UX, animations, and presentation. Codex must not independently redesign or take ownership of this work.
- Coordinate across the boundary through documented APIs and event contracts. Frontend code submits commands and renders results; it never decides move legality, adjudication, or match results. Match and Engine remain the sole authority for those decisions.
- These responsibilities supersede earlier role descriptions in historical handoffs. No implementation change is implied by this ownership update.

## Start here

The Last Stand is a serious, fully playable chess game first, enhanced by optional battle framing and storytelling. Narrative, animation, sound, and Chronicle must never alter chess rules, authoritative state, move acceptance, or results.

Read this file first, then [decisions](DECISIONS.md), the relevant [development history](DEVELOPMENT_HISTORY.md), [architecture](../architecture/ARCHITECTURE.md), and the owner-approved V1 Specification Revision 2. The canonical Revision 2 copy is [`V1_SPECIFICATION_REVISION_2.md`](V1_SPECIFICATION_REVISION_2.md). The in-repository [`Development/SPEC.md`](../../Development/SPEC.md) is an older v0.1 draft and is not authoritative.

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
| M3.3 — dead-position adjudication | **Experimental progress; open** | Bounded exhaustive detector, pending Match gate, worker execution, definitive adjudication events, witness validation, and replay checks. Resource-limited searches stay pending as `UNDETERMINED`; completeness and performance acceptance remain open. |

**M3.3 is authorized and remains open.** `Match` blocks moves and claims while adjudication is pending. The browser runs analysis in a terminable worker; definitive `LIVE`/`DEAD` results are recorded, and replay verifies witnesses or independently repeats exhaustive `DEAD` analysis. Cancellation, errors, and resource limits leave the Match pending. A verified mating line lets the standard starting position begin immediately. Custom initial positions are pending. Retries currently restart analysis; continuous continuation across resource-limited runs is not implemented.

## Architecture in force

- TypeScript, Vite, Vitest, browser-native UI; no React or game engine currently.
- Runtime dependency-free chess engine; Node and Chromium tests.
- Engine owns immutable `RuleState` and chess rule calculations. Match owns identities, authoritative events, actual repetition history, claims/results, and replay.
- Match supplies position history explicitly to pure engine draw evaluation. Repetition context is **not** owned by `RuleState` and is never inferred from FEN.
- A first local two-player browser UI exists. Narrative Resolver, presentation/queues, audio, cinematic, AI, and multiplayer are not implemented.
- Both original prototype copies remain read-only. Their recorded hashes and locations are in [architecture](../architecture/ARCHITECTURE.md).

## Required V1 work still outstanding

- **Complete dead-position detection is mandatory before V1 can be called fully standard-rules complete.** `detectDeadPosition` is experimental and may return `UNDETERMINED` at its configured time/node limits; `assessMatingPotential` remains an explicit `NOT_IMPLEMENTED` adapter. The detector must never guess `DEAD` or `LIVE`. No material-only shortcut is acceptable.
- Narrative Resolver and deterministic, versioned reaction records.
- Text presentation and completion queue, including grouping, persistence, and result-screen behavior.
- Opening cinematic integration, UI, and minimal text Chronicle.
- AI comes after the verified local engine/API. Online multiplayer is deferred to V1.5 or later.

Approved but still awaiting implementation includes the owner-approved product decisions in [DECISIONS.md](DECISIONS.md), including reaction tiers, Quick Play/Cinematic, Chronicle, and contribution-based dialogue.

## Risks and unresolved owner choices

- Dead-position computation is too slow for some positions: K+N-v-K and the Buchanan a4 fixture hit a 10-second per-side budget; same-colour K+B-v-K+B also remains unresolved. The browser worker terminates at cancellation/resource limits and the Match remains pending. Retries restart from the root, so continuous background progress remains an implementation gap.
- Classification thresholds, grouping policy P1/P2, text placement, dismissal completion, minimum readable duration, animation triggers, and Chronicle perspective choice remain open as listed in [DECISIONS.md](DECISIONS.md).
- Full perft verification beyond depth 3 is absent from the accepted M2.4 evidence.
- The canonical Revision 2 file is stored verbatim and retains stale draft-status language, including a footer saying implementation is blocked. The owner’s later approval recorded in [DECISIONS.md](DECISIONS.md) governs. The M3.2 decision that Match owns repetition history supersedes the spec’s older RuleState wording; see [DECISIONS.md](DECISIONS.md).

## Repository and Git caveat

The working directory is `D:\Development\The Last Stand`, while Git metadata is at `D:\Development\.git`; Git reports this directory as the worktree root. Scoped status reports the old nested `The Last Stand/...` paths as deleted and the current root-level files as untracked. This appears to be a repository-layout/index discrepancy. It was inspected but not repaired; do not stage, commit, push, or alter Git history. The owner handles all Git operations.

## Immediate next steps

1. Improve detector practicality without weakening the strict `UNDETERMINED` policy; implement resumable worker analysis or sound pruning and measure it.
2. Complete the Revision 2 experiment: exhaustive small-material comparison, frozen corpus, low-end device measurements, node/time/memory distributions, and `UNDETERMINED` share.
3. Verify worker cancellation in Chromium and complete remaining Match/replay edge cases. M3.3 remains open until every acceptance requirement is met.

## Evidence links

- [Full milestone and research history](DEVELOPMENT_HISTORY.md)
- [Owner-approved decisions and open items](DECISIONS.md)
- [Claude's preserved historical handoff](HANDOFF_CLAUDE.md)
- [Current production architecture](../architecture/ARCHITECTURE.md)
