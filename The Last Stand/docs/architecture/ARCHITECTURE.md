# The Last Stand — Production Architecture

**Status:** M1 foundation implemented; stack approved.

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

The initial source and tests implement M1 only. Later rules, Match persistence, presentation, and application UI remain outside the current implementation.

## System boundaries

- **Chess Engine:** Pure rules over `RuleState`. Owns legal moves, state transitions, check, draw-rule state and adjudication. Every operation is immutable: it must not mutate the input state, any previously returned `RuleState`, or nested repetition-context data. No piece IDs, match history, dialogue, DOM, or audio.
- **Match/Event System:** Owns match header, persistent piece IDs, append-only authoritative events, claims, result, replay, pinned versions, and derived piece facts. Uses the engine's single legal-move/apply path for live moves, intended-move claims, and AI search.
- **Narrative Resolver:** Reads committed event facts and emits deterministic, versioned narrative records and beats. No chess-state mutation, UI access, wall-clock inputs, or random selection.
- **Presentation:** Consumes narrative records. Owns text queues, Ordinary grouping, animation scheduling and presentation completion. Skipping or overload cannot alter match history or drop mandatory text.
- **UI:** Sends player commands to Match and renders returned state/events. It does not implement chess legality.
- **Audio:** Plays optional sound in response to presentation cues. It cannot delay or affect chess commands.
- **Cinematic:** Owns the opening scene and its timeline; it cannot read or mutate RuleState or Match.

Direction of dependencies: `UI → Match → Engine`; Match events feed `Narrative Resolver → Presentation → UI/Audio`. Engine has no dependency on other layers.

## Initial public API contracts

These are boundaries, not final TypeScript declarations. Names and serialized schemas can be refined during the approved implementation plan.

**Engine**

- `createInitialRuleState(): RuleState`
- `legalMoves(state: RuleState, from?: Square): readonly Move[]`
- `applyLegalMove(state: RuleState, move: Move): RuleState` — validates against legal moves, returns a new state, and does not mutate the input.
- `isInCheck(state: RuleState, side: Side): boolean`
- Subsequent engine work adds draw claims, automatic results, repetition context, and the isolated dead-position detector without creating a second move generator.

The complete `RuleState` contains board, side to move, castling rights, en-passant state, halfmove clock, and sufficient repetition context. M1 introduces the board and side-to-move core; later chess-rule milestones add the remaining fields immutably. Match-owned piece IDs and history do not enter AI/search state.

**Match**

- `createMatch(options): Match` — records match identity, initial position/ID registry, side-to-role mapping, and pinned rules/content versions.
- `commitMove(match, command): MatchTransition` — validates through Engine and returns the next match snapshot plus ordered authoritative events (including move facts and any terminal result).
- `claimDraw(match, command): MatchTransition` — validates a current-position or intended-move claim and records the specified outcome; legal false intended claims commit their declared move as a separate linked move event.
- `replayMatch(header, events): Match` — reconstructs the same RuleState, identities, claims, and result.

Match transitions are explicit values; callers cannot mutate event history or piece identity registries directly. Authoritative events use monotonic `eventSeq` within a match. Narrative reaction records use a separate monotonic `rseq`; presentation groups refer to reaction records and never consume or replace authoritative sequence numbers. The two sequences are distinct even when each move produces one event and one reaction.

## First implementation milestone (proposal)

**M1 — Engine foundation: ordinary legal moves from the standard initial position.** Establish TypeScript/Vite/Vitest tooling and implement initial state, the shared square/move types, ordinary moves for all piece types, king safety, and pure move application. Special moves, draws, Match persistence, UI, and narrative remain outside M1.

**M1 tests and gate:**

1. Initial position has exactly 20 legal moves; initial-position perft depth 2 matches 400.
2. Constructed cases cover each piece's ordinary movement, blocked sliding pieces, own-piece occupancy, check evasion, and pinned-piece king safety.
3. Illegal moves are rejected and leave the input RuleState unchanged; applying a legal move returns the correct new side-to-move and board.
4. The same checked-in engine test-vector corpus passes in Vitest's Node project and its Chromium Browser Mode project. Vitest Browser Mode requires an explicit provider; use `@vitest/browser-playwright` and Chromium rather than a DOM simulator for the browser run.

Do not proceed to castling, en passant, promotion, or draw-rule milestones until M1 passes review. Full standard chess rules and dead-position correctness remain mandatory before V1 acceptance.

**M1 verification (2026-11-07):** Vitest Node and Chromium projects passed (14 tests total); `tsc --noEmit` passed. This gate covers only ordinary moves and king safety, not complete chess correctness.

## Prototype preservation record

Both files were read for SHA-256 verification on 2026-11-07. They are different byte-for-byte; neither was modified.

| Copy | Location | Size | SHA-256 |
|---|---|---:|---|
| Workspace reference | `Development/Game/Prototypes/Claude-Prototype-0.1/Index.html` | 51,594 bytes | `12581522856CA6AE28037AF089635D071659D662F0BFCE892634AE2DFE862C08` |
| Downloaded reference | `C:\Users\knu\Downloads\The Last Stand.html` | 50,701 bytes | `2C30E1FAA4F178C3BC8C419BC7A6D3A9C961C3D1504C23F09A313A79EFF2D6BF` |

Treat both as read-only. Port selected cinematic scripts, canvas drawing, visual styling, glyph choices, and synthesized audio by adapting or re-creating them in production modules; never import the prototype page or edit either source file. Recheck hashes before any future acceptance that claims preservation.
