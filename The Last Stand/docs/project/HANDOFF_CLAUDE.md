# THE LAST STAND: CLAUDE HANDOFF
**As of 2026-11-08.** Written by Claude for a future Claude chat in this Project. Read this first, then `ARCHITECTURE.md` and the latest spec. Anything marked **(unverified)** is my belief, not something I confirmed.

---

## 0. How to use this file
1. Read sections 1-3 (project, people, rules of engagement) and 12 (open items).
2. Treat section 4 (decisions) as settled unless a concrete technical contradiction appears.
3. Use sections 6-10 as the technical record. They contain verified numbers so nothing needs re-deriving.
4. Do not assume anything is committed or pushed. The owner handles all Git.
5. **Keep replies short.** This project has hit usage limits many times because of long replies, big pasted documents and heavy experiments. Answer narrowly, run experiments only when a decision depends on one, and ask the owner to send specific files or diffs, not whole documents.

---

## 1. Project in one paragraph
The Last Stand is a strategically correct, fully playable chess game with cinematic storytelling. When a piece is captured it can speak a final line depending on the situation (sacrifice, trade, protecting the king, and so on). White is the attacker, Black the defender (story flavour only; rules are normal chess). There is a ~1 minute first-person opening cinematic, a text-first presentation (Quick Play or Cinematic with an optional animation panel), and a minimal text Chronicle retelling after the match. Online play is deferred. **Chess correctness comes first; narrative must never alter rules, timing, state or results.**

Layers: **Engine** (rules) → **Match** (piece IDs, authoritative events, claims, replay) → **Narrative Resolver** (deterministic reactions, beats) → **Presentation** (queues, grouping, animation) → **UI / Audio**. Dependency direction: UI → Match → Engine; Match events → Resolver → Presentation → UI/Audio.

## 2. People and roles
- **Owner (the user):** final authority on every decision. Does **all Git commits and pushes**. Warm, informal, collaborative. Likes that I do not treat decisions relayed through other agents as approved until they confirm them directly.
- **Claude (me):** architecture, specification review, independent technical scrutiny. I cannot run Claude Code here; the owner relays files. I have a GitHub connector (account `knu01`) that can read the public repo. I must not commit or push.
- **Codex:** implementation, tests, technical verification, performance. Does not commit or push.
- **ChatGPT:** coordination, consolidation, creative work (dialogue, lore, cinematic text), specification drafting.
- Files do not flow between agents automatically. The owner relays them.

## 3. Rules of engagement (approved, D14)
- Challenge each other with evidence; no blind agreement.
- After one round of disagreement, escalate to the owner with trade-offs and a recommendation.
- Codex may flag implementation feasibility before anything is approved.
- Approved decisions are not silently changed. Do not reopen them without a concrete technical contradiction.
- "Done" means tested. Handoff notes after each piece of work.
- Working principle now: **Build, test, play, improve.** Reviews exist to prevent foundational rework and must lead to implementation.
- Distinguish: approved decision / technical requirement / my recommendation / open question.

---

## 4. Approved decisions (owner-confirmed)
The owner confirmed directly that all decisions relayed through ChatGPT's documents were approved, and (Nov 7) that all recommendations in "SPEC v0.4 Revision 2" were approved.

| Area | Decision |
|---|---|
| Tone | Epic and serious, occasional dark humour; important moments keep their weight |
| Scope | Local two-player first, AI second. Online deferred to V1.5+. |
| Chess | Full standard rules and draw rules. **Complete dead-position detection is mandatory** and must not be silently weakened to material-only. |
| Identity | Persistent opaque piece IDs; promotion keeps the pawn's ID |
| Reactions | **Contribution-based:** Heroic and Unknown pieces get individual reactions; Ordinary deaths are grouped (a lone Ordinary death gets a one-piece card); every capture keeps its record. This **superseded** "every victim speaks". |
| Heroic | Includes sacrifice-candidate deaths and king-protection deaths (when deterministically detected) |
| Timing | Classification frozen at death for live play. Chronicle may recognise later contributions but cannot rewrite live classification or history. |
| Beats | Rule-based, deterministic, derived from history in V1; strategic analysis deferred |
| Presentation | Quick Play = text. Cinematic = same text + optional skippable animation panel that never blocks anything and never replaces text. Mode switching is immediate in local play. Per-player independent preferences (matters online; in future online play each player's preference is chosen at match start and locked). |
| Chronicle | Minimal text Chronicle in V1; post-match, skippable, independent per player, never delays the result, tells both sides' story; full cinematic Chronicle later |
| Queue | Capturer reactions expire after 2 plies if stale; mandatory reactions never expire before first display; backlog >= 2 compresses to ~1.5 s; minimum readable duration by playtest; bubbles ~3 s, max 2 visible |
| Result | Mandatory reactions are shown before the result screen; no cutoff; the authoritative result event is not delayed |
| Non-capture lines | Deferred to V1.1 (check, castle, promotion, mate dialogue) |
| Roles | White = attacker, moves first; Black = defender |
| Prototype | Original prototype stays untouched; production uses a separate engine |
| Stack | TypeScript, Vite, Vitest, browser-native HTML/CSS/Canvas, no React or game engine, dependency-free engine at runtime |
| Draw claims (D31) | Wrong current-position claim: rejected, game continues. Wrong claim with a legal intended move: that move is played. Illegal intended move: rejected first. No time penalty in V1. **Every claim attempt is recorded.** |
| Notable captures | Capturer may speak on revenge, queen captured, or victim value >= rook |
| Revenge | Capturing the piece that captured one of your side's pieces on the immediately preceding ply |
| Ally reactions | Excluded from V1 |

**Approved dialogue priority orders (Nov 7):**
- Victim: `king_protection > sacrifice_candidate > en_passant > queen_fall > unrecapturable > trade > pawn_journey > generic`
- Capturer: `revenge > queen_taken > major_capture` (one capturer reaction per capture)

Game phases (provisional, configurable): endgame when `piecesLeft <= 12` (takes precedence), else earlygame when `fullMove <= 10`, else midgame. Pawn tags (config): `fresh_recruit` before full move 10, `veteran` alive >= 20 full moves, `advanced` on the opponent's half, `home_guard` never moved.

---

## 5. Project history and status

### 5.1 Spec lineage
v0.1 (my first SPEC, still in the repo) → v0.2 → v0.2.1 → v0.3 → my v0.4 (consolidated) → **"V1 Specification, Revision 2"** by ChatGPT and Codex (the current base; supersedes my v0.4). Revision 2 lives in the chat history and the owner's local docs, not in my outputs. If it differs from my `SPEC.md` v0.4, Revision 2 wins.

**Details my v0.4 had that Revision 2 dropped (restore if needed):** the five-step fallback chain (below), pawn tags and phase usage, the 1.5 s and 2-ply queue numbers, reload/watermark persistence basics, animation lifecycle states and fatigue controls, Chronicle feasibility notes, my dead-position findings.

**Unresolved factual dispute:** Revision 2 says the paper's quick method missed "3 of 90,546". I re-read the paper (LIPIcs version): it says 84,100 unfairly classified games, the quick version found 84,097, missed 3. I could not find 90,546. Ask Codex for the source.

### 5.2 Implementation status (per owner, via ChatGPT, Nov 8)
- **M1** engine foundation: immutable RuleState, legal moves, king safety, structured `tryApplyMove`, interned frozen pieces, FEN parse/print, validation. 29 tests (Node + Chromium).
- **M2.1** castling; **M2.2** en passant (incl. discovered-check and check-resolution cases); **M2.3** promotion; **M2.4** regression and perft: all six standard positions match at depths 1-3 (deeper not run because immutable perft took ~94 s through depth 3).
- **M3.1** Match foundation: deterministic piece IDs, event log with `eventSeq`/`ply`, castling moves both IDs, en passant uses the canonical capture square, promotion keeps ID, replay, uses `tryApplyMove` as sole legality authority. 78 Node tests + 2 Chromium, `tsc` clean.
- **Next: M3.2** draw rules and Match adjudication. After that, dead-position detection, then Narrative Resolver, presentation, UI, AI, minimal Chronicle.
- I have **not seen the code**; everything about it is from descriptions.

### 5.3 Repository state
- GitHub: `knu01/Development` (**public**; I could not see it while private; the connector only reached public repos). Anything pushed is world-readable.
- Old repo layout: `The Last Stand/{AGENTS.md (empty), PROJECT_STATUS, README.md, Development/{CHECKPOINTS.md, DEVELOPMENT_LOG.md, SPEC.md (v0.1), Game/Prototypes/Claude-Prototype-0.1/}}`.
- `README.md`, `PROJECT_STATUS`, `CHECKPOINTS.md` say "pre-development, no tech stack, engine not started". They contradict reality. **The owner said not to change them yet**; cleanup comes after current changes are reviewed. `AGENTS.md` is empty and should receive the D14 rules.
- Local project root: `D:\Development\The Last Stand`; architecture doc: `docs/architecture/ARCHITECTURE.md`. Git currently reports the old nested paths as deleted and the new workspace files as untracked. Probably the project root moved relative to the Git root; inspect `git status` and where `.git` lives before staging anything.

### 5.4 Prototype preservation (verified)
- Uploaded/GitHub copy: 50,701 bytes, LF, SHA-256 `2C30E1FA…EFF2D6BF`. The git blob on `main` is byte-identical to it.
- Workspace copy: 51,594 bytes, SHA-256 `12581522…FE862C08`. **It is the same file with every newline turned into CRLF** (I converted the upload and got the exact hash). Cause: `.gitattributes` has `* text=auto`.
- Recommendation (not done): mark the prototype path `-text` so its bytes stay exact, and designate the LF content as the canonical baseline.
- What the prototype contains (reference only, not a correctness target): single HTML file (893 lines), own engine, a partial draw implementation (auto-draw at 100 halfmoves, not FIDE), a 2-ply AI with random noise, ~40 hard-coded reaction lines with categories (trade/"honored", free, robbed, queen, pawn, en passant, check, castle, promotion), a ~64 s canvas cinematic with two POVs and skip/Esc, synthesized audio. A suspected CSS bug (class `.dot` used for both the turn indicator and legal-move markers) is **unverified**.

---

## 6. Engine and Match design guidance I gave
- **Board:** 64-entry array (index 0 = a8 … 63 = h1) is sound. `Object.freeze` throws on non-empty typed arrays (verified), so a frozen plain array of interned pieces or integer codes is the safe route.
- **Piece aliasing:** pieces come only from an interned frozen table; constructors and parsers replace incoming pieces with the interned ones. (Adopted.)
- **Move:** canonical, built only by the engine: `from, to, piece, promotion?, capture? {piece, square}, castle? {side, rookFrom, rookTo}, doublePawnPush?`. En passant is derived when `capture.square !== to`. `MoveInput {from, to, promotion?}` is what callers send. (Adopted.) Identity is `(from, to, promotion)`. I also recommended a deterministic `legalMoves` ordering (by from, then to, then promotion Q,R,B,N) and choosing `null` over optional fields for stable shapes and JSON. (Not confirmed adopted.)
- **Apply result:** `tryApplyMove` returns `{ok, state, facts{move, givesCheck, checkersAfter}}` or a failure reason; `applyLegalMove` throws. One implementation behind both. Add an internal unchecked apply for moves that came from `legalMoves`.
- **Attack queries:** `attackersOf` is geometric (includes pinned pieces) and returns ascending squares; `checkers`; `legalMovesTo`; `legalCapturesOf(state, victimSquare)` (legal, uses `capture.square`, so en passant works). Geometric defence (`wasDefended`) and legal capture (`supporters`, `canRecapture`) must never be conflated. Dedupe supporters by `from` (capture-promotions yield four moves per piece).
- **Position vs RuleState:** `Position` = placement, side, castling rights, en passant target. `RuleState extends Position` with halfmove clock, fullmove number, repetition context. The AI and the dead-position module clone `Position`, which is cheap.
- **Repetition context:** keys since the last capture or pawn move only (no position can recur across those), so at most ~150 entries; construction is immutable.
- **Match IDs:** parallel ID array updated by a pure function of the `Move`: normal move (ID from→to), capture (remove the ID at `capture.square`), castling (also move the rook ID), promotion (ID stays, type changes). The engine never imports Match.
- **FEN:** validate everything the spec lists, plus: castling rights must be supported by king and rook placement; the en passant target must be consistent (rank, empty target, pawn behind it); the side not to move must not be in check; **do not limit piece counts** (dead-position fixtures use extra bishops). `toFen` prints the raw en passant target after any double push; reference tools differ (python-chess prints it only if a legal capture exists), so compare against references by key, not raw FEN.
- **Performance flag:** perft depth <= 3 over six positions took ~94 s (on the order of a few thousand nodes/s if every node uses `tryApplyMove`; **inference, unmeasured**). The dead-position search needs 10^5-10^6 nodes, so before it starts: unchecked internal apply (same code path), delta-based move application so make/undo can be added later behind the immutable public API, and a benchmark in Node and Chromium (perft depth 4-5 plus a real workload such as exhausting K+N v K, 436,648 states).
- **Immutability:** M1's legality filter copied the board per pseudo-legal move; replace internally with make/test/unmake on a private scratch board without changing the public contract.

## 7. Event, claim and narrative model (from the spec work)
**Engine event facts (per committed move):** `matchId`, `eventSeq`, `ply` (first move = 1), `fullMove`, mover `{id, side, typeBefore, typeAfter}`, from/to, `castleSide`, rook movement, `promotionTo`, `captured {id, type, side, square, ...}`, flags (en passant, gives check, gives mate), `checkers` (ordered by square), `wasDefended` (geometric, pins/x-rays ignored, en passant uses landing square), `canRecapture` (legal immediate recapture after the capture), `supporters` (friendly non-capturer pieces with a **legal** capture of the victim square just before; empty for en passant), `pressure` (`gave_check` or the moved piece geometrically attacks an enemy piece of equal-or-higher value), `answeredCheck {pieceId, how: block|capture|king_move, checkerIds}`, `previousCapture` (capture on ply-1), `piecesLeft`, `halfmoveClock`, `repetitionCount`. Values: P1 N3 B3 R5 Q9 K4. Non-applicable fields are `null`, not `false`.
- **Critical:** `answeredCheck` and `previousCapture` must derive from the last **committed move** by `ply`, not the previous event, because claim events can sit between moves.
- `eventSeq` (all authoritative events) is separate from the narrative `rseq` (reaction records). Keys: `(matchId, eventSeq)`; reactions `(matchId, rseq)`.
- **Claim event:** `claimId`, `matchId`, `eventSeq`, `ply` (plies completed), claimant, basis (`threefold`|`fifty_move`), mode (`current`|`intended_move`), `intendedMove|null`, outcome (`accepted`|`rejected_condition_not_met`|`rejected_illegal_move`), `intendedMoveExecuted`. A false intended-move claim with a legal move records the rejected claim and then the move as the next, linked event.
- **Result event:** outcome (checkmate/stalemate/draw/resignation), reason (`checkmate`, `stalemate`, `dead_position`, `fivefold_repetition`, `seventy_five_moves`, `threefold_claim`, `fifty_move_claim`, `resignation`), winner (attacker/defender/null). At most one per match.

**Contribution tiers (computed at death, frozen):**
- **Heroic:** killed >= 1 piece; or answered a check by block/capture (non-king); or died as a king-protection capture; or died as a sacrifice candidate.
- **Unknown:** not Heroic, with >= 1 `supportedCapture` (the piece was in `supporters` for an ally's capture; defaults: victim value >= 3, at least 1 supporter; thresholds open). Records objective support, not causation; the name avoids claiming "helped".
- **Ordinary:** everything else.
- `king_protection`: the previous committed move's `answeredCheck.pieceId` equals the victim (block or capture, victim not the king) and this ply captures it.
- `sacrifice_candidate`: victim moved last on ply-1, `capturedValue > moverValue`, no legal recapture, and the victim's last move had `pressure`. A heuristic; never claims intent; will misfire.
- `unrecapturable` (renamed from `undefended`): captured and no legal recapture. `wasDefended` remains a separate flavour fact.

**Selection and determinism:** fallback chain: (1) situation + piece + tags; (2) situation + piece; (3) situation + `piece:"any"` (lines authored neutral, never borrowed from another piece); (4) the piece's generic lines; (5) least-recently-used reuse, tie-break lowest `lineId`, logged. Pick = `FNV-1a-32(canonical UTF-8 input) mod count` over candidates sorted by `lineId`; canonical bytes need explicit field order, UTF-8, length-prefix width and endianness, unsigned overflow, and shared Node/browser test vectors. Used-line set per match, shared by both sides, rebuilt by replaying reaction records. No `Math.random` anywhere in the narrative path. Pin resolver/classifier/hash/content/grouping/schema versions in the match header; reaction records should carry the resolved text (or old content versions must be archived) so saved matches replay identically.

**Presentation:** three separate lifecycles (text delivery, animation playback, Chronicle). Statuses: `pending`, `presented`, `representedByGroup`, `expired` (capturer only), `dismissed`. "Presented" = full text visible for the minimum duration while the page is visible, or dismissed by the player after display began (my recommendation). The watermark is the highest contiguous `rseq` whose records are all terminal. Interrupted reactions return to `pending` and reappear as text. Reconnect: local watermark per match in V1; reserve `presentedThrough`, version pins and dedupe keys for online. Animations: separate queue linked by reaction ID; states queued/playing/completed/skipped/expired/dropped/interrupted; only text counts as presented. Ordinary grouping candidates: P1 fixed window (`firstPly + 2`) vs P2 show immediately and extend; decide by testing on identical histories.

---

## 8. Chess rules: verified facts (FIDE Laws and python-chess)
- Dead position (5.2.2): no series of legal moves can checkmate; the game ends immediately. Clock-free definition (the paper uses it). The automatic draw rules apply separately; a model that stopped at the 75-move rule would end games earlier than the Laws do.
- Position identity (9.2.2): same side to move, same pieces and squares, same possible moves; en passant counts only if a pawn could capture (so legal-en-passant semantics); castling **rights** count until forfeited (not whether castling is currently possible).
- Claims (9.2, 9.3): only the player to move; threefold current or about-to-appear; 50-move at 100 halfmoves, with an intended non-pawn, non-capture move allowed to reach 100.
- 9.5.2: a **correct** claim = the game is immediately drawn. So with an intended move the move is **not played, even if it would be checkmate**. 9.5.3: an incorrect claim means the intended move must be made (the 2-minute clock penalty is not used in V1). **My v0.2.1 spec said the opposite; that was wrong and was corrected.**
- 9.6: fivefold repetition and 75 moves (150 halfmoves) are automatic; **checkmate takes precedence over the 75-move rule**.
- Not verified by me: exact wording of 9.2.3 / 9.4 (right to claim lost when a player moves without claiming). Codex to confirm.
- Recommended result ordering after each move: checkmate > stalemate > dead position > fivefold > 75-move. A Match created from a FEN should not auto-adjudicate; boundary tests set the clock to 99.

**Verified behaviours (python-chess):**
- Knight shuffle (Nf3 Nf6 Ng1 Ng8 repeated): start position count is 2 at ply 4, 3 at ply 8, 4 at ply 12, 5 at ply 16. Threefold is claimable at ply 7 (via the intended move Ng8) and ply 8; fivefold fires at ply 16.
- En passant square with an **illegal** capture (rank pin `8/8/8/KPp4r/8/8/8/7k w - c6 0 1`) gives the same repetition key as `-`; with a **legal** capture the keys differ; different castling rights give different keys.
- 50-move claim: unavailable at clock 98, available at 99 (quiet intended move), available at 100. At clock 149, a quiet move gives a 75-move draw; a **mating** quiet move gives checkmate (precedence).
- Stalemate FEN `7k/5Q2/6K1/8/8/8/8/8 b - - 0 1`; fool's mate `f3 e5 g4 Qh4#`.

## 9. Test fixtures with verified counts (independent run, all match the published values)
| Position | FEN | Depth 1…n |
|---|---|---|
| Start | `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1` | 20, 400, 8,902, 197,281, 4,865,609 |
| Kiwipete | `r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1` | 48, 2,039, 97,862, 4,085,603 |
| Position 3 | `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1` | 14, 191, 2,812, 43,238, 674,624 |
| Position 4 | `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1` | 6, 264, 9,467, 422,333 |
| Position 5 | `rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8` | 44, 1,486, 62,379, 2,103,487 |
| Position 6 | `r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10` | 46, 2,079, 89,890, 3,894,594 |

Special-move content by depth (counted): Start has no en passant, castling or promotion through depth 4 (en passant first at depth 5: 258). Position 3: none through depth 2 (en passant at depth 3: 2). Position 6: none through depth 4 (no castling rights). Position 5, Position 4 and Kiwipete have castling or promotion at depth 1-2.

**Targeted positions (legal-move counts verified):**
```
 5 pinned knight no moves      4k3/4r3/8/8/8/4N3/8/4K3 w - - 0 1
10 pinned rook file only       4k3/4r3/8/8/8/4R3/8/4K3 w - - 0 1
 6 pinned bishop diag only     4k3/8/8/8/1b6/8/3B4/4K3 w - - 0 1
 2 double check, king only     4k3/8/8/8/8/3n4/8/4K1r1 w - - 0 1
 4 check: block or move        4r1k1/8/8/8/8/8/3B4/4K3 w - - 0 1
 3 kings may not touch         8/8/8/8/8/5k2/8/4K3 w - - 0 1
 4 EP illegal (rank pin)       8/8/8/KPp4r/8/8/8/7k w - c6 0 1
 9 EP resolves pawn check      8/8/8/2k5/3Pp3/8/8/4K3 b - d3 0 1
26 castling both sides         r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1
23 O-O through attacked f1     4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1
26 O-O-O with b1 attacked ok   1r2k3/8/8/8/8/8/8/R3K2R w KQ - 0 1
 4 no castling out of check    4k3/4r3/8/8/8/8/8/R3K2R w KQ - 0 1
12 promotion to 4 pieces       8/P1k5/8/8/8/8/5K2/8 w - - 0 1
16 capture-promotion           1n6/P1k5/8/8/8/8/5K2/8 w - - 0 1
```
Recommended oracle: python-chess as a dev-only differential test (legal moves, status, repetition and claim flags at every ply of random games). Never a runtime dependency (D10).

---

## 10. Dead-position research record
**Source:** Ambrona, *A Practical Algorithm for Chess Unwinnability* (FUN 2022, LIPIcs). Dead = unwinnable for **both** sides (evaluate each side separately). Structure: (1) static mobility analysis (sound, incomplete; **requires no castling rights and no en passant**), (2) pawn-free lemmas, (3) iterative-deepening helpmate search with a transposition table (~10,000-node iterations in the paper), returning "unwinnable" only if the search finished without hitting its limits. Complete only with unbounded effort; some contrived positions can be slow; the general problem is PSPACE-hard on generalized boards.
- Reported (C++, author's sample): full version avg 370 µs, max 141 ms over 32.6M Lichess games; quick version avg ~5 µs, max 586 µs, but incomplete (missed 3 of 84,100 per my reading). Author suggests it could run after every move. These are not JavaScript or low-end-device numbers.
- The paper's evaluation is mostly endgame positions from timeout games; middlegames are expected to be cheap (just find one mate) but this is **unmeasured**.
- Reference code (per Codex, **unverified by me**): CHA-Solver commit `3484c7e65247003fac8705a9290dc2b5d0978b94` (MIT); Ashlar Chess commit `7c768f516bff7b56323330abd4011b71bba335dd` (GPL-3). Implementing from the paper is fine; reusing code needs a license check at a pinned commit.

**My naive experiment** (Python, no pruning, exhaustive reachability of any checkmate, state key = placement/side/castling/legal en passant, clocks ignored; ~17,000 states/s):
| Position | Result | States |
|---|---|---|
| K v K | dead | 7,224 |
| K+N v K | dead | 436,648 (25 s) |
| Paper Position 1 (blocked pawns, bishops) | dead | 146,874 (8 s) |
| Paper Position 2 (Buchanan, pawn a4) | dead | 220 |
| Same with pawn on a5 | mate reachable | 311 |
| K+B v K+B same colour | not finished | > 600,000 |
Conclusion: naive search is not viable even for trivial dead positions; the paper's layers are needed. My search agrees with the paper on Buchanan's position (validates my decoding of the diagram and the search).

**Proposed design (recommendation):** separable module on `Position`; layers: pawn-free lemmas → shallow witness search (LIVE) → static analysis (when no castling/en passant) → iterative deepening with budget. Outcomes `DEAD` (proven both sides), `LIVE` (verified witness), `UNDETERMINED`. **Invariants:** DEAD only when proven; a budget stop is never proof; UNDETERMINED never ends the game as a draw and cannot be silently ignored. **Open owner decision (after measurements):** policy for UNDETERMINED: (a) bounded extra analysis (e.g. in a worker) before the next move is accepted, or (b) a documented rare gap, which is a deviation from standard rules and needs explicit owner approval. Success criteria: zero false DEAD against a brute-force oracle at small material, node/time distributions and p99 on a low-end device, share of UNDETERMINED over a real-game corpus. Detector witnesses must replay through the production legal-move engine.

Core of the naive oracle (reusable for tests):
```python
import chess
def search(fen, cap):
    b = chess.Board(fen); key = lambda b: b._transposition_key()
    if b.is_checkmate(): return "MATE_REACHABLE", 1
    seen = {key(b)}; nodes = 1; stack = [iter(list(b.legal_moves))]
    while stack:
        mv = next(stack[-1], None)
        if mv is None:
            stack.pop()
            if stack: b.pop()
            continue
        b.push(mv); k = key(b)
        if k in seen: b.pop(); continue
        seen.add(k); nodes += 1
        if b.is_checkmate(): return "MATE_REACHABLE", nodes
        if nodes > cap: return "BUDGET_EXCEEDED", nodes
        stack.append(iter(list(b.legal_moves)))
    return "DEAD (exhausted)", nodes
```
(Scratch scripts were in my sandbox at `/home/claude/deadpos`; they may not persist. Needs `pip install chess`.)

---

## 11. M3.2 review I gave (draw rules and Match adjudication)
- **Repetition key:** first four FEN fields with en passant `-` unless a legal en passant capture exists; castling rights as flags; no piece IDs. RuleState holds keys since the last capture/pawn move.
- **Division:** Engine owns `positionKey`, repetition count, `evaluateAutomaticOutcome(state)` and pure `evaluateClaim(state, basis, intendedMove?)` (applies the intended move to a hypothetical state); Match owns commands, events and finality.
- **Match extensions (minimal):** `claimDraw`, `resign`, `claim` and `result` event kinds, a finished status with `game-over` rejection of further moves, claim attempts appended to history even when rejected (this differs from M3.1's "rejected moves return Match unchanged"; document it; replay must cover claim events), wrong-side claims are command errors not events.
- **Dead positions** are a separate milestone; M3.2 only reserves an interface slot with an explicit "unimplemented" status and never guesses LIVE.
- **Tests:** the sequences and boundary cases in section 8, fixtures in section 9, a python-chess differential test, replay tamper tests, and "rejected claims never change chess state".
- Open: FIDE 9.2.3/9.4 lost-right wording; unchecked-apply benchmark.

---

## 12. Open items
**Owner decisions still open (with the data that decides them):**
1. Dead-position `UNDETERMINED` policy (after the spike).
2. Acceptable Heroic / Unknown / Ordinary shares (after a classification simulator over >= 50 real games; the owner reads ~10 transcripts). Risk: if `supporters` is too permissive, nearly everyone speaks and grouping barely matters.
3. Text placement (board bubbles vs side feed vs hybrid), decided by playing the prototype.
4. Which events trigger animations; fatigue controls.
5. Ordinary grouping policy P1 vs P2.
6. Minimum readable duration; whether dismissal counts as presented.
7. Whether V1 ships both Chronicle perspectives (recommended yes if template-based).
8. Draw offers and agreed draws (V1.1 unless the owner moves them).
9. Repository and documentation cleanup (explicitly deferred by the owner), and the Git layout reconciliation.

**Technical items:** M3.2 design and Match API extensions; unchecked-apply benchmark; deterministic move ordering; FEN validation extras; hash serialization ratification; grouped-card/watermark behaviour; resolve the 84,100 vs 90,546 paper-statistic dispute; dead-position spike and license review; where saved matches keep resolved reaction text.

**Known risks:** `sacrifice_candidate` will misfire; `wasDefended` ignores pins/x-rays by definition; content volume (dialogue pools, grouped text, Chronicle, animation) is the biggest creative cost; attention load from board + text + panel needs playtesting; perft beyond depth 3 is unverified in the project.

## 13. What I owe or can do next (when asked)
- Review the M3.2 Match API changes and the draw-rule code (send the types or a diff, not the whole repo).
- Review the dead-position milestone design when it starts.
- Restore the dropped Revision 2 details (fallback chain, pawn tags, queue numbers) into the spec if the owner wants one more consolidated version.
- Answer narrow technical questions. No new experiments unless a decision depends on one.

## 14. Notes on working with this owner
- Confirm important decisions directly; do not treat relayed approvals as approved.
- Be candid about uncertainty and about my own mistakes (I have made several: the claim-with-mate rule, "AI search copies ids only", claiming corrections were applied when they were not). Own them plainly and fix them.
- Keep replies short. Offer one clear recommendation, mark what needs the owner's decision, and ask at most one question.
