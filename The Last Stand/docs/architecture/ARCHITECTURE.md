# The Last Stand — Production Architecture

**Status:** M1–M2.4 complete; M3.1 Match foundation and M3.2 draw adjudication implemented; complete dead-position detection remains unimplemented; stack approved.

## Technology and project layout

Use TypeScript, Vite, Vitest, and browser-native HTML/CSS/Canvas. Do not add React or a game engine at this stage. The chess engine has no runtime dependencies; development and test tools are build-time dependencies. Pure engine and match modules must run in both Node and the browser. Run shared test vectors in Vitest's Node project and Browser Mode project, using `@vitest/browser-playwright` with Chromium for actual browser execution. Keep Playwright and its browser binaries in development/test tooling; application code must not import them.

```text
src/
  engine/          RuleState, legal moves, transitions, chess adjudication
  match/           Match, piece IDs, authoritative events, claims, replay
  narrative/       Objective facts to tiers, beats, deterministic reactions
  presentation/
    queue/         FIFO scheduling, grouping, status, watermark
    text/          Quick Play and Cinematic text
    animation/     Optional non-blocking animation lifecycle
  ui/              Board, input, menus, settings, result and Chronicle screens
  audio/           Sound playback and audio preference
  cinematic/       Opening cinematic renderer and scripts
  app/             Composition root and startup
assets/
  images/ audio/ fonts/
tests/
  engine/ match/ narrative/ presentation/ fixtures/
docs/architecture/
Development/Game/Prototypes/Claude-Prototype-0.1/Index.html  # immutable reference
```

The engine implements ordinary moves, castling, en passant, promotion, checkmate and stalemate detection, threefold/fivefold repetition, and the 50/75-move rules. M3.2 stores repetition history in Match and verifies draw claims/results through replay. Complete dead-position detection remains an explicit unimplemented V1 requirement; no material-count shortcut is treated as equivalent. Narrative, presentation, and application UI remain outside the current implementation.

## System boundaries

- **Chess Engine:** Pure rules over `RuleState`. Owns legal moves, state transitions, check, canonical position keys, and pure draw-condition evaluation. Repetition history is supplied explicitly by Match and is never stored in or inferred by the Engine. Every operation is immutable. No piece IDs, match history ownership, dialogue, DOM, or audio.
- **Match/Event System:** Owns match identity, persistent piece IDs, append-only authoritative move/claim/result events, repetition history, result state, and replay. It supplies its history to Engine draw evaluation and uses Engine's single legal-move/apply path. Complete dead-position detection remains unimplemented.
- **Narrative Resolver:** Reads committed event facts and emits deterministic, versioned narrative records and beats. No chess-state mutation, UI access, wall-clock inputs, or random selection.
- **Presentation:** Consumes narrative records. Owns text queues, Ordinary grouping, animation scheduling and presentation completion. Skipping or overload cannot alter match history or drop mandatory text.
- **UI:** Sends player commands to Match and renders returned state/events. It does not implement chess legality.
- **Audio:** Plays optional sound in response to presentation cues. It cannot delay or affect chess commands.
- **Cinematic:** Owns the opening scene and its timeline; it cannot read or mutate RuleState or Match.

Direction of dependencies: `UI → Match → Engine`; Match events feed `Narrative Resolver → Presentation → UI/Audio`. Engine has no dependency on other layers.

## Initial public API contracts

These are the implemented Engine and M3.1 Match contracts. Future milestones may extend them without introducing a second move-generation or transition path.

**Engine**

- `createInitialRuleState(): RuleState`; `createRuleState(input): RuleState` copies the board and interns every piece as a frozen shared value. The owned board and state are frozen.
- `RuleState` stores the 64-square board, side to move, castling rights, en-passant target, halfmove clock, and fullmove number. It contains no repetition history.
- `MoveInput` is the caller's move request. `Move` is canonical and includes mover, capture square/piece, promotion/castling slots, double-push fact, and check result.
- `legalMoves(state, from?): readonly Move[]` returns canonical move facts.
- `tryApplyMove(state, input): MoveApplicationResult` canonicalizes, checks legality, and applies through one implementation. `applyLegalMove` is a throwing convenience wrapper over `tryApplyMove`; it is not a second rule path.
- `isInCheck(state: RuleState, side: Side): boolean`
- `parseFen(fen): RuleState` validates six-field FEN syntax; `toFen(state): string` prints all six fields. FEN parsing preserves castling, en-passant, and both clocks without requiring the position to be usable by the move engine.
- `validateEnginePosition(state)` returns `{valid, errors}` with stable error codes. `legalMoves` and `isInCheck` reject structurally unsuitable positions with those codes. Validation checks board shape, king counts and separation, pawn ranks, and consistency of castling/en-passant metadata; it does not prove that a position is historically reachable from a legal game. Callers can preserve or inspect syntactically valid but structurally unsuitable FENs without passing them to engine operations.
- `positionKey(state)` identifies piece placement, side to move, castling rights, and a legally available en-passant capture. Raw FEN en-passant metadata without a legal capture is excluded; clocks and Match piece IDs are excluded.
- `repetitionCount(history, key)`, `evaluateClaim(state, history, input)`, and `evaluateAutomaticOutcome(state, history)` are pure. `history` is explicitly supplied by Match and includes the current position. Intended-move claims use `tryApplyMove` hypothetically and do not mutate `RuleState`.
- Automatic engine outcomes include checkmate, stalemate, fivefold repetition, and the 75-move rule; checkmate is checked first. Claim evaluation covers threefold and the 50-move rule. `assessMatingPotential` has an explicit interface but returns `undetermined / NOT_IMPLEMENTED`; `ENGINE_CAPABILITIES.deadPositionDetection` is `unimplemented`.

Match-owned piece IDs and history do not enter AI/search state. FEN stores all six fields; the engine implements ordinary moves, castling, en-passant capture, and promotion. No dead-position result is guessed from material counts.

**Match**

- `createMatch({ gameId, initialState? }): Match` — requires a deterministic game ID, copies and validates the initial RuleState, assigns piece IDs by initial square, creates the square-to-ID map and registry, and starts `positionHistory` with only the current position key. It never infers prior repetition from FEN.
- `commitMove(match, input): MatchTransition` — delegates legality and state transition to `tryApplyMove`, updates identities, resets Match repetition history after a pawn move or capture (otherwise appends the new key), records the key/count/halfmove clock, then appends an automatic result when applicable.
- `claimDraw(match, { claimant, basis, intendedMove? }): ClaimTransition` — wrong-side and game-over requests are command errors with no event. Accepted claims append `claim` and `result`; rejected claims append a reasoned `claim`; a legal intended move after an incorrect claim is committed through `commitMove` and marked as executed in the claim event.
- `replayMatch(config, events): Match` — re-commits moves and re-evaluates claims through Engine/Match. It verifies event identity/order, claim outcome, automatic result, position keys, repetition counts, halfmove clocks, and piece IDs.

Match transitions are explicit immutable values; callers cannot mutate event history, repetition history, the square-to-ID map, or piece registry. Move, claim, and result events share monotonic `eventSeq`; only moves advance `ply`. A move event records canonical Engine facts plus its resulting `positionKey`, `repetitionCount`, and `halfmoveClock`. Narrative reaction records will use a separate `rseq`; M3.2 creates no narrative or presentation events. Dead-position adjudication remains unavailable until a complete detector is implemented.

The FIDE 2023 Laws say in Article 9.4 that a player who touches a piece as described in Article 4.3 loses the right to claim under 9.2 or 9.3 on that move. This command API has no physical touch state; a player submits an explicit claim before any move is committed. Clock penalties are also outside this no-clock V1 procedure. For an incorrect claim based on a legal intended move, the move is still committed normally, matching the intended-move requirement in Article 9.5.3.

## First implementation milestone (proposal)

**M1 — Engine foundation: ordinary legal moves from the standard initial position.** Establish TypeScript/Vite/Vitest tooling and implement initial state, the shared square/move types, ordinary moves for all piece types, king safety, and pure move application. Special moves, draws, Match persistence, UI, and narrative remain outside M1.

**M1 tests and gate:**

1. Initial position has exactly 20 legal moves; initial-position perft depth 2 matches 400.
2. Constructed cases cover each piece's ordinary movement, blocked sliding pieces, own-piece occupancy, check evasion, and pinned-piece king safety.
3. Illegal moves are rejected and leave the input RuleState unchanged; applying a legal move returns the correct new side-to-move and board.
4. The same checked-in engine test-vector corpus passes in Vitest's Node project and its Chromium Browser Mode project. Vitest Browser Mode requires an explicit provider; use `@vitest/browser-playwright` and Chromium rather than a DOM simulator for the browser run.

Do not proceed to castling, en passant, promotion, or draw-rule milestones until M1 passes review. Full standard chess rules and dead-position correctness remain mandatory before V1 acceptance.

**M1 verification (2026-11-07):** Initial foundation verification passed 14 tests across Vitest Node and Chromium; `tsc --noEmit` passed. Subsequent approved corrections and verification are recorded in the task report. This gate covers only ordinary moves and king safety, not complete chess correctness.

**M2.1 — Castling:** The engine generates and applies all four castling moves. It requires the matching right and home king/rook, clear intervening squares, and unattacked origin, transit, and destination squares. Canonical moves identify `kingSide` or `queenSide`; transitions move the rook and revoke rights after king/rook movement or capture of a rook on its home square. Targeted castling tests and the published Kiwipete depth-one perft count (48) pass. Kiwipete depth two is not used as a gate until en-passant capture is implemented, because its tree includes an en-passant reply.

**M2.2 — En passant:** Generation requires the current target, a correctly placed adjacent pawn, and the opposing pawn on its just-moved square. Canonical capture facts identify that actual victim square. Legal-move simulation removes both pawns before checking king safety; application preserves immutability and clears the target after every subsequent move. FEN round-trips retain valid targets even when no legal capture exists. The published Position 3 fixture (`8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1`) matches perft depths 1–3: 14, 191, 2812 (Chess Programming Wiki, [Perft Results](https://www.chessprogramming.org/Perft_Results)).

**M2.3 — Promotion:** A pawn reaching the final rank yields four distinct canonical moves; callers must select queen, rook, bishop, or knight explicitly. Quiet and capture promotions use interned pieces and participate in the normal king-safety filter. Check and checkmate are observable through the existing move facts, `isInCheck`, and legal-move results. FEN prints the promoted piece using its selected type. Published Position 4 (`r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1`) matches perft depths 1–3: 6, 264, 9467 (Chess Programming Wiki, [Perft Results](https://www.chessprogramming.org/Perft_Results)).

**M2.4 — Special-move regression and perft hardening:** `tests/fixtures/published-perft.ts` records the exact six standard FENs and all published positive-depth counts available on the Chess Programming Wiki Perft Results page, including the source URL. The regression suite verifies depths 1–3 for all six positions. It also checks canonical move/application consistency at each root and en-passant capture facts. Deeper published counts remain recorded in the fixture but are not part of this run.

**M3.1 — Match Foundation:** `src/match/` owns deterministic game IDs, stable piece IDs based on initial squares, the square-to-ID map, active/captured piece records, immutable move events, and replay. `commitMove` calls `tryApplyMove` as the sole legality and application authority. Match translates canonical capture facts (including the en-passant victim square), castling facts, and promotion facts into ID updates; it does not inspect Piece object identity. Events use `eventSeq` and `ply`, with no narrative `rseq` or presentation records. Draw adjudication and complete dead-position detection remain outstanding.

**M3.2 — Draw Rules and Match Adjudication:** Engine position keys use legal en-passant availability and castling rights, without clocks or piece IDs. Match owns the actual position history, starts FEN matches with one current key, resets history after pawn moves/captures, and supplies it to pure Engine evaluation. Threefold/50-move claims, fivefold/75-move automatic results, stalemate, and checkmate are recorded as immutable claim/result events and independently recomputed during replay. Intended-move claims are hypothetical; accepted claims do not play their move, while an incorrect claim with a legal intended move records the claim and then uses normal move commitment. Checkmate takes precedence over the 75-move draw. Dead-position evaluation exposes `assessMatingPotential` but remains explicitly unimplemented; no insufficient-material guess is made.

## Prototype preservation record

Both files were read for SHA-256 verification on 2026-11-07. They are different byte-for-byte; neither was modified.

| Copy | Location | Size | SHA-256 |
|---|---|---:|---|
| Workspace reference | `Development/Game/Prototypes/Claude-Prototype-0.1/Index.html` | 51,594 bytes | `12581522856CA6AE28037AF089635D071659D662F0BFCE892634AE2DFE862C08` |
| Downloaded reference | `C:\Users\knu\Downloads\The Last Stand.html` | 50,701 bytes | `2C30E1FAA4F178C3BC8C419BC7A6D3A9C961C3D1504C23F09A313A79EFF2D6BF` |

Treat both as read-only. Port selected cinematic scripts, canvas drawing, visual styling, glyph choices, and synthesized audio by adapting or re-creating them in production modules; never import the prototype page or edit either source file. Recheck hashes before any future acceptance that claims preservation.
