# The Last Stand — Development History

**Last updated:** 2026-11-08
**Scope:** Technical history and acceptance evidence available in the repository, owner instructions, milestone reports, and preserved handoff. Missing dates or details are marked rather than inferred.

For current status see [Project State](PROJECT_STATE.md). Owner decisions are indexed in [Decisions](DECISIONS.md). The original Claude document is preserved in [HANDOFF_CLAUDE.md](HANDOFF_CLAUDE.md) and is historical, not the current authority.

## 1. Prototype and preservation

The project began with Claude Prototype 0.1, a standalone HTML chess prototype with a board/UI, basic chess play, a weak 2-ply AI, hard-coded reactions, synthesized audio, and an approximately 64-second skippable two-perspective canvas opening. It was played through as a complete game. Its simplified draw handling, AI, and reaction selection are reference behavior only, not correctness targets.

The owner approved preserving both copies untouched and building a separate production engine. Architecture records these baselines (verified 2026-11-07):

| Copy | Location | Size | SHA-256 |
|---|---|---:|---|
| Workspace reference | `Development/Game/Prototypes/Claude-Prototype-0.1/Index.html` | 51,594 bytes | `12581522856CA6AE28037AF089635D071659D662F0BFCE892634AE2DFE862C08` |
| Downloaded reference | Owner's Downloads folder | 50,701 bytes | `2C30E1FAA4F178C3BC8C419BC7A6D3A9C961C3D1504C23F09A313A79EFF2D6BF` |

Claude's handoff reports that the logical content is the same with LF versus CRLF line endings; that explanation is historical handoff evidence. The two byte-level hashes differ. No prototype changes were authorized or made during the memory setup.

## 2. Specification and architecture lineage

The specification evolved through v0.1, v0.2, v0.2.1, v0.3, Claude's v0.4, and the consolidated V1 Specification Revision 2. Revision 2 is the current owner-approved authority according to later owner instructions. Its supplied copy still says “Draft for Owner Approval” and “Implementation remains blocked”; these labels were not updated in the file. The later approval controls. The currently supplied Revision 2 file is outside the repository; `Development/SPEC.md` is the old v0.1 draft. No specification was changed in this task.

Technology and production structure were approved before implementation: TypeScript, Vite, Vitest, browser-native UI, no React/game engine for now, and no runtime chess-engine dependencies. The architecture separates Engine, Match/Event System, Narrative Resolver, Presentation, UI, Audio, and Cinematic. Engine and Match are implemented; later layers are not.

### Important proposal history and corrections

- The original “every victim speaks” idea was superseded by contribution-based classification: Heroic and Unknown receive individual reactions; Ordinary captures are grouped, including a one-piece group card. Every capture still retains an individual record.
- A draft placed repetition context in `RuleState`. The owner later approved the architecture amendment: **Match owns actual repetition history**; Engine receives history explicitly for pure evaluation. This is implemented in M3.2.
- An older proposal included resignation in M3.2. The owner explicitly excluded it; it remains unimplemented.
- An earlier claim interpretation was corrected: a valid intended-move draw claim ends the game before the move is played, even when that move would otherwise mate. An incorrect intended-move claim with a legal move records the rejected claim and then executes the move by the ordinary commit path.
- A proposed insufficient-material shortcut was rejected for V1 dead-position correctness. The current detector interface stays `UNDETERMINED / NOT_IMPLEMENTED`; it makes no guessed result.
- FNV-1a 32-bit was discussed as a deterministic content-selection hash, not a security mechanism. Canonical byte serialization and cross-runtime vectors remain specification/implementation work for the Narrative Resolver; it is not part of current code.

## 3. Milestone history

Exact completion dates for M1–M2.4 were not consistently recorded. The implementation and verification facts below are drawn from the production architecture, owner milestone reports, test fixtures, and handoff. Counts are reported with their source/scope where records differ.

### M1 — Engine foundation

**Objective:** Establish immutable state, ordinary legal moves, king safety, a canonical move application path, and Node/browser test execution.

**Implemented:** 64-square array, interned frozen pieces, safe immutable board ownership, canonical move facts, structured `tryApplyMove` with `applyLegalMove` wrapper, check/legal move handling, FEN parse/print, structured `validateEnginePosition` errors, and a named/tested promotion-bound exclusion that was removed when promotion arrived in M2.3. Castling, en passant, promotion, draw rules, Match, UI, AI, and narrative were excluded from M1.

**Verification/acceptance:** Owner accepted the foundational corrections. The architecture records the initial M1 foundation run as 14 tests across Node and Chromium and `tsc --noEmit` passed (2026-11-07). Claude's later handoff reports 29 final M1 tests across Node and Chromium but explicitly says she had not seen the code and relied on reports. These counts may represent different scopes; no single combined count is asserted here. Later full-suite counts supersede these milestone snapshots for the current codebase.

**Changed files:** Exact M1 file list is not preserved in a milestone report. Current engine files include `src/engine/state.ts`, `types.ts`, `move-generation.ts`, `apply-move.ts`, `fen.ts`, `draw-rules.ts`, and `index.ts`; do not treat this current list as an exact M1-only diff.

**Limitations:** Promotion-bound exclusion applied only until M2.3. Initial M1 did not establish full chess correctness.

### M2.1 — Castling

**Objective/implementation:** Add all four castling moves; require rights and king/rook home-square occupancy; check origin, transit, and destination attacks; revoke rights on king/rook movement and capture of a rook on its original square; preserve immutable transitions and canonical facts.

**Verification:** Targeted tests and Kiwipete perft depth 1 (48) passed. The M2.1 gate was accepted. Kiwipete depth 2 was not a gate before en passant support because its tree includes an en-passant reply.

**Changed files / exact test count:** The exact M2.1-only file list and test count were not retained in the milestone summary. Current dedicated tests are in `tests/engine/castling.test.ts` and `tests/fixtures/m2-castling.ts`.

### M2.2 — En passant

**Objective/implementation:** Generate only permitted en-passant captures, remove the victim from its actual square, correctly reject discovered self-check, allow en passant that resolves check, create/expire targets correctly, and preserve FEN target metadata.

**Verification:** Legal, discovered-check, and check-resolution positions passed. Published Position 3 perft matched depths 1–3: **14, 191, 2,812**. Full Node/Chromium suites and TypeScript checks passed per the milestone report. M2.2 was accepted.

**Fixture:** `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1`; source is the Chess Programming Wiki Perft Results page, linked from `tests/fixtures/published-perft.ts`.

### M2.3 — Pawn promotion

**Objective/implementation:** Add explicit queen, rook, bishop, and knight promotion; quiet and capture promotions; no silent queen default; immutable piece replacement; legal king-safety filtering; canonical capture facts; remove the M1 promotion-bound exclusion; preserve FEN output.

**Verification:** Targeted tests include all choices, captures, checks/checkmate, invalid/missing promotion choices, check evasions, ownership/immutability, and regressions. Published Position 4 matched depths 1–3: **6, 264, 9,467**. Full Node/Chromium suites, TypeScript, and `git diff --check` passed according to the milestone report. M2.3 was accepted.

**Fixture:** `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1`; source is Chess Programming Wiki Perft Results.

### M2.4 — Special-move regression and perft hardening

**Objective/implementation:** Verify six published perft positions, special-move interactions, and move-generation/application consistency; fix only demonstrated defects.

**Verification/acceptance:** All six fixtures matched their published counts at depths 1–3. Depths 4+ were not run; the acceptance is explicitly limited to documented scope. Full Node and Chromium suites, TypeScript, whitespace check, and existing perft regression tests passed in the owner report. M2.4 was accepted for that scope, not as a claim that every listed deeper perft count was run.

| Position (source: Chess Programming Wiki, Perft Results) | Exact FEN | Depth 1 / 2 / 3 |
|---|---|---:|
| Start | `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1` | 20 / 400 / 8,902 |
| Kiwipete | `r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1` | 48 / 2,039 / 97,862 |
| Position 3 | `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1` | 14 / 191 / 2,812 |
| Position 4 | `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1` | 6 / 264 / 9,467 |
| Position 5 | `rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8` | 44 / 1,486 / 62,379 |
| Position 6 | `r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10` | 46 / 2,079 / 89,890 |

Fixture source: [Chess Programming Wiki — Perft Results](https://www.chessprogramming.org/Perft_Results); exact FENs/counts are also recorded in `tests/fixtures/published-perft.ts`.

**Changed files/fixes:** No exact M2.4 changed-file list or specific fix list is retained in the supplied completion summary. Do not infer that no fix occurred.

### M3.1 — Match Foundation

**Objective:** Add immutable Match state and identity/event/replay management without duplicating chess legality.

**Implementation:** Deterministic game ID supplied at creation; stable piece IDs deterministically assigned from initial squares; square-to-ID map and piece registry with side/current type/active-captured status. Ordinary moves preserve IDs; victims are captured, including en passant by canonical capture square; castling moves king and rook IDs; promotion keeps the pawn ID and changes current type. `commitMove` uses Engine `tryApplyMove` as the sole authority, updates Match immutably, and appends an authoritative move event. Rejected moves preserve the original Match. Replay reuses Engine transitions. `eventSeq` remains separate from future narrative `rseq`.

**Verification/acceptance:** **78 Node tests and 2 Chromium tests**, TypeScript check, and whitespace check passed; the owner accepted M3.1. Replay equivalence, identity handling, rejected move immutability, and special-move cases were covered.

**Files reported:** `src/match/` foundation modules and tests under `tests/match/`; `docs/architecture/ARCHITECTURE.md`. Exact M3.1-only file names are not fully preserved in the report; M3.2 later extended some of these files.

### M3.2 — Draw Rules and Match Adjudication

**Objective:** Implement canonical repetition keys, Match-owned repetition history, claimable and automatic draw rules, results, replay checks, and an explicit non-implemented dead-position interface.

**Implementation and decisions:**

- `positionKey` includes piece placement by side/type, side to move, castling rights, and en passant only when a legal en-passant capture exists. It excludes piece IDs and clocks. Raw FEN en-passant metadata is preserved by FEN round trips, but repetition identity ignores it when no legal en-passant capture exists.
- Match owns actual chronological repetition history and supplies it to pure Engine evaluation. A FEN-created Match starts with only its current position key; FEN never invents earlier history. Repetition history resets after pawn moves and captures; otherwise the new key is appended. Rights changes affect the key but do not independently cause a reset.
- Threefold repetition and the 50-move rule are claims; fivefold repetition and the 75-move rule are automatic. Stalemate and checkmate are adjudicated. Checkmate takes precedence over the 75-move automatic draw.
- Correct intended-move claims end the game without playing the declared move. Incorrect legal intended-move claims are recorded and then run through normal move commitment. Illegal intended moves are rejected before claim evaluation. Wrong-side claims are command errors without events. Claim/result events are replayed and independently verified; move events retain position key, repetition count, and halfmove clock facts.
- `assessMatingPotential` exists as a reserved interface but returns `undetermined / NOT_IMPLEMENTED`; no insufficient-material shortcut or guessed result is used. Resignation is excluded.

**FIDE review:** The Codex completion report states it verified FIDE 2023 Article 9.2.3 position identity semantics, Article 9.4 loss of claim right on a move after touching a piece as described in Article 4.3, and Article 9.5.3 for incorrect intended-move claims. The command API has no physical touch state, so claims are explicit before a committed move. V1's approved no-clock procedure applies no time penalty and records every attempt. This is a deliberate adaptation, not full clock-penalty procedure.

**Oracle and limits:** `python-chess` 1.11.2 was used as a development-only differential oracle, not a runtime dependency. Tests compared scripted repetition, a seeded 40-ply game, clock boundaries, and claim flags across legal intended moves; the mating quiet-move precedence case was hand-tested. Differential agreement is supporting evidence, not a proof of correctness.

**Local performance measurements:** 5,000 starting-position `legalMoves` calls took **560.65 ms**; 1,000 immutable `commitMove` calls took **473.35 ms**. These are local benchmark measurements, not broad performance guarantees. No unchecked-move/search optimization was approved based on them.

**Verification/acceptance:** **117 Node tests across 13 files and 2 Chromium tests** passed; TypeScript, `git diff --check`, and whitespace checks passed. M3.2 implementation and verification were reported complete and the owner accepted the milestone.

**Files reported as changed:**

- `docs/architecture/ARCHITECTURE.md`
- `src/engine/draw-rules.ts`, `src/engine/index.ts`
- `src/match/types.ts`, `src/match/result-events.ts`, `src/match/create-match.ts`, `src/match/commit-move.ts`, `src/match/claim-draw.ts`, `src/match/replay-match.ts`, `src/match/index.ts`
- `tests/engine/draw-rules.test.ts`, `tests/engine/python-chess-differential.test.ts`, `tests/match/draw-adjudication.test.ts`, `tests/fixtures/python-chess-draw-oracle.json`, `tsconfig.json`

**Limitations:** Complete dead-position detection and its `UNDETERMINED` policy remain open. Resignation, draw offers, Narrative Resolver, presentation, UI, AI, and multiplayer are unimplemented. M3.2 does not complete all V1 chess correctness requirements.

## 4. Dead-position research and unresolved experiment

The owner-approved requirement is full standard dead-position detection: a position is dead only if neither side can checkmate through any legal sequence. Detection must assess each prospective mating side independently. Required outcomes are `LIVE` (verified witness), `DEAD` (both sides proven unable), and `UNDETERMINED` (at least one side unresolved). A budget limit cannot be treated as proof; `UNDETERMINED` cannot silently end the game as a draw.

The cited research is Ambrona, *A Practical Algorithm for Chess Unwinnability*, FUN 2022. The paper's layered method uses sound but incomplete static analysis under preconditions, pawn-free lemmas, and iterative-deepening helpmate search with transposition reuse. The paper's implementation timings and corpus results do not predict JavaScript or low-end-device performance. The Revision 2 text reports the quick method missing 3 of 90,546 positions; Claude's handoff disputes the denominator, reading 84,100 positions and 84,097 classified correctly. This statistic needs reconciliation against the paper before it is quoted as settled fact. The owner-approved SPEC cites pinned reference repositories/licenses; any code reuse requires pinned-commit license review and is not authorized by the reference alone.

Claude's handoff includes a naive Python reachability experiment (scratch environment, not reproduced here): K-v-K exhausted 7,224 states; K+N-v-K 436,648; two blocked/bishop examples 146,874 and 220; moving one pawn changed a 220-state exhausted case to a 311-state mating witness; K+B-v-K+B same-colour exceeded 600,000 without finishing. The handoff itself labels these scratch findings; they are not production measurements or current acceptance evidence.

**Experiment 3 required by Revision 2:** freeze corpus, source versions, seeds, oracle/rules semantics, budgets, and search limits; test both sides; verify every LIVE witness with production move logic; compare small-material exhaustive cases; report false-DEAD count (must be zero), node/time/memory distributions including p99, and `UNDETERMINED` share by corpus category on a stated low-end device. No experiment result or owner fallback policy is claimed here.

## 5. Specification decisions and open work

The [decision register](DECISIONS.md) is the canonical index. Important unresolved implementation/design items include the detector's formal rules model and `UNDETERMINED` behavior; acceptable Heroic/Unknown/Ordinary shares after a classification simulator; supported-capture threshold; grouping P1 versus P2; text placement; dismissal/minimum readability semantics; animation triggers; and Chronicle perspective presentation. Resignation inclusion is an owner-open V1 scope item in Revision 2 but is not in M3.2; do not assume it has been approved for implementation. Online play remains V1.5 or later.

The current production architecture is [ARCHITECTURE.md](../architecture/ARCHITECTURE.md). For future milestones, add exact dates, files, commands, test counts, acceptance, and unresolved issues to this history only when verified.

### M3.3 — Experimental pending adjudication and detector progress (2026-11-09)

**Status:** Experimental progress only; M3.3 remains open and is not accepted complete.

**Implementation:** `src/engine/dead-position.ts` provides bounded exhaustive search with independent prospective mating-side searches, position identity based on placement/side/castling/legal en-passant (excluding clocks and Match IDs), production-engine replay of LIVE witnesses, and UNDETERMINED on cancellation, errors, or resource limits. `src/engine/dead-position-runner.ts` and `dead-position.worker.ts` provide terminable browser-worker execution. `src/match/adjudicate-pending.ts` and Match transitions gate moves/claims while pending, resume after LIVE, and record DEAD as a draw. Replay reconstructs pending states, checks LIVE witnesses, reruns search for DEAD, and enforces event ordering. UI disables play while pending and offers retry after unresolved analysis. Retries currently restart from the root.

The standard initial board begins in progress only because a known legal mating line is verified through the production move engine. Nonterminal custom starts begin pending. This is an implementation expedient and does not claim the initial position itself is dead-position-adjudicated.

**Detector benchmark snapshot:** One local Windows development-host run, configured for a maximum of 800,000 nodes and 10 seconds per side. Values are measurements, not a device-independent guarantee. Heap delta is a post-run heap observation affected by garbage collection, not peak memory.

| Fixture | Result | Visited nodes (white / black) | Elapsed | Heap delta |
|---|---|---:|---:|---:|
| K-v-K | DEAD | 7,224 / 7,224 | 6,812.5 ms | +28,482,576 B |
| Standard start after 1.e4 | LIVE | 1,342 / 0 | 768.4 ms | -3,900,000 B approx. |
| K+N-v-K | UNDETERMINED, resource limit | 31,352 / 0 | 10,000.6 ms | +729,736 B |
| Ambrona FUN 2022 Position 1 | DEAD | 11,802 / 11,802 | 18,727.4 ms | -10,707,168 B |
| Buchanan Position 2, pawn a4 | UNDETERMINED, resource limit | 43,094 / 0 | 10,000.2 ms | +38,654,992 B |
| Buchanan Position 2, pawn a5 | LIVE | 11,435 / 0 | 5,568.6 ms | +65,379,592 B |
| Queen-v-K | LIVE | 11,103 / 0 | 6,135.2 ms | not captured reliably |
| Position with castling rights | LIVE | 8,554 / 0 | 5,016.6 ms | not captured reliably |
| Legal en-passant position | LIVE | 151 / 0 | 23 ms | not captured reliably |
| Same-colour K+B-v-K+B | UNDETERMINED, resource limit | 26,643 / 0 | 9,999.9 ms | not captured reliably |

Ambrona fixtures are derived from the position diagrams and descriptions in [the FUN 2022 paper](https://drops.dagstuhl.de/opus/volltexte/2022/15972/pdf/LIPIcs-FUN-2022-2.pdf), then represented as FEN for this experiment. Both difficult unresolved cases are reported; no timeout was omitted. This is a single snapshot and not the approved corpus experiment: no low-end device, p99/peak-memory distribution, corpus-wide UNDETERMINED rate, or exhaustive small-material oracle comparison was completed.

**Verification:** Earlier full Node run passed 132 tests across 16 files; TypeScript no-emit check and Vite production build passed. These precede the final benchmark-fixture edits and must be rerun before any completion claim. Browser tests could not run because the configured Playwright Chromium executable is absent. The new browser worker cancellation test is present but therefore unverified in Chromium. Final verification outcome is recorded in the current task report, not inferred from prior runs.

**Remaining acceptance work:** rerun the full Node suite, TypeScript, and production build after final edits; execute browser tests where Chromium is available; make search practically viable or show the approved experiment evidence; address resumable worker analysis; measure peak memory and low-end performance; and complete exhaustive small-material comparison. Strict `UNDETERMINED` behavior remains in force.

### Team responsibility update (owner, 2026-11-09)

The owner assigned Codex as Engineering Lead, responsible for Engine and chess rules, Match/adjudication, dead-position detection, game state and authoritative events, AI/multiplayer logic, backend architecture and tests, performance, and correctness. Claude owns frontend implementation, visual design, UI/UX, animations, and presentation. Cross-boundary work is coordinated through documented APIs and event contracts. Frontend behavior may submit commands and render state/events but cannot become authoritative for legality or match results. This supersedes earlier role descriptions and changes no implementation code.
