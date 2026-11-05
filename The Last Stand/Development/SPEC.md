# THE LAST STAND: SPEC v0.1 (DRAFT FOR USER APPROVAL)

Status: consolidates Rounds 1-7. Not yet reviewed by Codex. Do not implement until the user approves.

**Tags used throughout**
- **[A]** approved by the user
- **[R]** Claude recommendation, needs user approval
- **[C]** Codex decides (implementation detail)

---

## 1. What we are building

Chess with normal rules, where every captured piece gets a final spoken line. White is the **attacker**, black the **defender**; roles are story flavor only. A ~1 minute first-person opening cinematic precedes the match. Goal: play online vs humans or the computer. **[A]**

Principle: **the engine reports facts, the narrative layer interprets them, the UI displays them.** The engine never chooses a line or a situation name. **[A]**

## 2. Decision record (approved)

| # | Decision | Status |
|---|---|---|
| D1 | Tone: epic and serious, occasional dark humour, never undermining an important moment | [A] |
| D2 | Every victim speaks. Capturer speaks only on notable captures (D6). | [A] |
| D3 | Attacker and defender share dialogue pools; occasional role-specific lines | [A] |
| D4 | Bubble ~3s, max 2 visible at once | [A] |
| D5 | Every reaction is kept permanently in match history | [A] |
| D6 | Notable capture = revenge, OR queen captured, OR victim value >= rook | [A] |
| D7 | Revenge = capturing the piece that captured one of your side's pieces on the immediately preceding ply | [A] |
| D8 | Ally reactions excluded from v1 (v1.1) | [A] |
| D9 | White = attacker, moves first. Player-selectable roles later. | [A] |
| D10 | Own dependency-free engine, proven by tests (not assumed correct) | [A] |
| D11 | Two-layer events: engine facts, then narrative reaction events | [A] |
| D12 | Persistent piece IDs; promotion keeps the pawn's ID | [A] |
| D13 | Server (or solo-local equivalent) is authoritative for events and line choice. No `Math.random` in the narrative path. | [A] |
| D14 | Collaboration rules: challenge with evidence, one round then escalate, Codex may flag feasibility, user decides, decisions are documented, "done" means tested, handoff notes | [A] |

## 3. v1 / v1.1 boundary

**v1**
- Engine with piece IDs, per-ply fact events, history counters
- Victim reactions for every capture; capturer reactions on notable captures
- Resolver with taxonomy in section 6, five-step fallback, deterministic selection
- Presentation queue (section 8)
- Opening cinematic (existing, two POVs, skippable)
- Solo vs AI and local two-player, using the same code path as online

**v1.1 and later**
- Ally reactions
- Callback lines that reference past kills (data ships in v1, content later)
- `prevented_king_attack`
- Better sacrifice detection (needs search depth)
- Player-selectable roles
- Stronger AI, difficulty levels

**Before online multiplayer (not v1 gameplay, but v1 code must not block it)**
- Server, rooms, reconnect, idempotent event handling
- Threefold repetition and a correct 50-move rule

## 4. Modules and ownership

```
engine.js      chess rules, state, ids[64], emits fact events   Owner: Codex (Claude reviews)
resolver.js    facts -> reaction events                          Owner: Claude (Codex implements)
reactions.json dialogue library + piece personalities            Owner: ChatGPT
config.json    thresholds (pawn tags, phases, timings)           Owner: Claude
ai.js          computer opponent, never touches match history    Owner: Codex
ui.js          board, bubbles, queue                             Owner: Codex
cinematic.js   opening cinematic                                 Owner: Codex / ChatGPT (script)
```
One owner per file at a time. **[R]**

## 5. Engine

### 5.1 Identity
- Each piece has an opaque string ID (e.g. `"p7"`). IDs are never parsed and never encode type or side. **[R]**
- State holds `ids[64]` parallel to the board. Castling moves the king's and rook's IDs. En passant removes the victim ID from its own square (not the landing square). Promotion keeps the ID and changes `type`.
- The AI search copies `ids` only. Match history and `events[]` exist only on the real game object; search simulations must never mutate them.

### 5.2 Per-piece record
```
id           string
side         "attacker" | "defender"
origType     "P|N|B|R|Q|K" at start
type         current type
bornPly      int (0 for starting pieces)
promotedPly  int | null
moves        int; +1 each time this piece moves (castling: +1 king, +1 rook)
lastMovePly  int | null
kills        [victimId, ...] in order (en passant victim included)
checkAnswers int; +1 when this piece answered a check by block or capture
checksGiven  int; +1 when, after its move, THIS piece attacks the enemy king
             (discovered checks are an event fact only)
diedPly      int | null
killedBy     pieceId | null
```
Pieces hold counters and ID references only. `events[]` is the source of truth.

### 5.3 Engine event (facts only), exactly one per ply
```
ply, fullMove
mover:   { id, type, side }
from, to
captured: null | { id, type, side, moves, bornPly, lastMovePly, square }
          // square != to only for en passant
flags:   { enPassant, promotion, castle, givesCheck, givesMate }
wasDefended      bool   // friendly piece geometrically attacks the capture
                        // square on the PRE-capture board; pins and x-ray
                        // ignored (v1 definition). En passant: landing square.
canRecapture     bool   // a LEGAL immediate recapture exists on the POST-capture board
moverValue, capturedValue    // P1 N3 B3 R5 Q9 K4
pressure         null | "gave_check" | "attacked_equal_or_higher"
                 // describes THIS move
answeredCheck    null | { pieceId, how: "block"|"capture" }
                 // set on the move that answered a check
previousCapture  null | { ply, moverId, capturedId, square }
                 // the capture on ply-1, if there was one (revenge fact)
piecesLeft
```
Because there is exactly one event per ply, `ply` is the idempotency key. **[R]** (simplifies the earlier `seq` + `type` proposal)

**Correction to Round 6:** `answeredCheck` lives on the event of the move that *answered* the check, not on the later capture event. The resolver reads the previous ply's event to verify king protection.

## 6. Narrative resolver

Input: engine events. Output: reaction events. It has no randomness except the deterministic seed below.

### 6.1 Operational definitions (v1)
- **trade:** `captured != null` and `canRecapture`.
- **undefended:** `captured != null` and `!canRecapture`. (`wasDefended` is kept as a separate fact for flavor, e.g. defended but pinned: `wasDefended && !canRecapture`.)
- **king_protection:** the previous ply's event has `answeredCheck.pieceId == victim.id` and this ply captures that piece.
- **sacrifice_candidate:** victim moved last on `ply-1`, AND `capturedValue > moverValue`, AND `!canRecapture`, AND the victim's previous move had `pressure != null`. Heuristic only. It is never presented as confirmed intent, and it records which pressure condition triggered it.
- **en_passant:** `flags.enPassant`.
- **queen_fall:** captured piece is a queen.
- **revenge (capturer speaks):** `previousCapture != null` and `captured.id == previousCapture.moverId`. The original victim is `previousCapture.capturedId`.
- **major_capture (capturer speaks):** `capturedValue >= 5` or queen captured.
- **pawn tags (derived, thresholds in config.json):**
  `fresh_recruit` = captured before full move 10; `veteran` = alive >= 20 full moves; `advanced` = on the opponent's half (side-relative); `home_guard` = `moves == 0`.
- **game phase (derived):** `earlygame` fullMove <= 10, `endgame` piecesLeft <= 12, else `midgame`. **[R]** thresholds configurable.

### 6.2 Priority (victim line)
`king_protection > sacrifice_candidate > en_passant > queen_fall > undefended > trade > pawn_journey > generic`

Revenge and capturer lines are a **separate pass** with a different speaker; they do not compete with the victim's line. Capturer situations: `revenge`, `queen_taken`, `major_capture`.

### 6.3 Selection
1. Eligible lines: situation + piece, whose required tags are a subset of the event's tags.
2. Fallback chain, stopping at the first step with an unused line:
   1. situation + piece + tags
   2. situation + piece
   3. situation + `piece: "any"` (lines authored as neutral, never borrowed from another piece)
   4. the piece's own generic lines
   5. reuse: the least-recently-used line from the best non-empty pool; tie-break by lowest `lineId`. Logged as `fallbackStep: 5`.
3. Pick: sort eligible lines by `lineId` byte-wise ascending; index = `hash(gameId + "|" + ply + "|" + role + "|" + situation) mod count`. **[C]** names the exact hash (recommendation: cyrb53 or FNV-1a over UTF-8).
4. "Used" set is rebuilt by replaying reaction events (never stored separately).
5. A step-5 hit means the pool is too thin. No-repeat is a content target, not an invariant.

### 6.4 Reaction event
```
ply, speaker: { pieceId, role: "victim"|"capturer" },
situation, tags[], lineId, text, slots, fallbackStep, contentVersion
```
The event carries the resolved `text`, so clients do not need the library. `contentVersion` is pinned per match so mid-match edits cannot change a replay. **[R]**

Per move: at most 2 reaction events (victim, then capturer if notable).

## 7. Content rules (for ChatGPT)
- Victim line for every capture; under ~12 words; slots like `{by}` allowed
- Voice per piece: King dignified/burdened; Queen proud/cutting; Rook stoic; Bishop reflective; Knight brave/defiant; Pawn humble/resilient
- Target pool size: about 8+ lines per (situation, piece) for core situations, more for trade and undefended
- Role-specific lines allowed, but they must not redefine personality
- Non-capture lines (check, castle, promotion, mate) from the prototype: see open question Q2

## 8. Presentation queue (client-side only, never affects state)

- Queue entries: reaction events in order of `ply`, victim before capturer.
- Max 2 bubbles visible; default 3s per line. **[A]**
- Expiry is measured in **plies**, not seconds: a queued entry is stale when `currentPly - event.ply >= 2` at the moment it would be shown.
- **Capturer reactions** (and future ally reactions) expire when stale. Expired entries stay in history and the dispatch log, marked `expired` in the client log only.
- **Victim reactions never expire before first display** [A]. If the backlog is 2 or more, they are **compressed** (display ~1.5s each) instead of skipped. **[R]**
- Line duration **[R]**: 3s, +0.15s per word beyond 12, capped at 5s.
- AI pacing **[R]**: the AI waits (up to 2.5s) while victim reactions are still pending, so the board does not run far ahead of the text.
- At game end, pending victim reactions show before the result overlay. **[R]**
- The dispatch log lists every reaction event regardless of what was displayed. **[A]**

## 9. Multiplayer constraints (v1 code must respect)
- Server runs engine + resolver; clients render only. Solo mode uses the same code locally.
- `ply` is monotonic; applying the same event twice has no effect.
- Reconnect = replay engine events + reaction events; used-line set rebuilt from replay.
- Bubble pacing is client-side and never feeds back into state.
- Engine and resolver must be loadable by both Node and browser (ES modules). **[C]**

## 10. Required tests
**v1:** perft counts; legal recapture detection; castling ID tracking; en passant ID tracking; promotion keeps ID; `wasDefended` on en passant; defended-but-pinned case; AI search never mutates real history; deterministic selection across repeated runs; fallback chain order; revenge fact on consecutive captures.
**Before online:** event replay and reconnect idempotency; cross-environment hash equality (Node vs browser).
**Later:** threefold repetition, correct 50-move/75-move rules, full insufficient-material.

## 11. Known simplifications (documented, not hidden)
- Draw rules: auto-draw at 100 half-moves; thin insufficient-material check; no repetition.
- `wasDefended` ignores pins and x-ray batteries.
- `sacrifice_candidate` will sometimes misfire.
- AI is two-ply with one difficulty.
- Prototype CSS: class `.dot` is shared by the turn indicator and legal-move markers (suspected bug, unverified).

## 12. Open questions for the user
- **Q1. Rules conflict in the queue.** D5 and the Round 6 text allow stale reactions to expire, but also say a victim's reaction must not expire before first display. I resolved it in section 8 by letting only capturer lines expire and compressing victim lines. Is that what you want?
- **Q2. Non-capture lines.** The prototype has lines for check, castling, promotion and mate. Keep them in v1 as short ambient lines, or drop them until captures are polished?
- **Q3. Game phase thresholds** (section 6.1) are my guess. Fine for v1?

## 13. For Codex [C]
Refactor vs rewrite of the prototype engine; exact hash and encoding; test framework; shared Node/browser module format; whether the AI needs a worker (measure first); `canRecapture` cost per capture; draw-rule priority.
