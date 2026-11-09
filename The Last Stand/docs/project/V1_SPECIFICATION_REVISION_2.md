# THE LAST STAND
## V1 Specification — Revision 2

**Status:** Consolidated draft for owner approval  
**Supersedes:** SPEC v0.4 draft and, through it, SPEC v0.3  
**Implementation status:** Not approved for implementation  
**Authority:** Project owner

### Decision labels

- **[A] Approved:** Explicitly approved by the owner.
- **[T] Technical requirement:** Required for a correct, reproducible implementation.
- **[R] Recommendation:** Proposed direction; not automatically approved.
- **[OPEN] Unresolved:** Requires evidence, an experiment, or an owner decision.

**Core principle:** Build the chess game correctly. Make the battle unforgettable. Never sacrifice one for the other.

---

# 1. Product scope

## 1.1 Objective [A]

The Last Stand is a strategically correct chess game with deterministic narrative reactions, distinctive piece personalities, optional cinematic presentation, and a minimal post-match Chronicle.

Chess correctness is the highest priority. Narrative and presentation must never alter legal moves, chess state, or authoritative match results.

## 1.2 Product principles [A]

1. Chess rules and competitive integrity come first.
2. The engine records objective facts.
3. The narrative resolver interprets those facts.
4. The presentation layer displays the resulting narrative.
5. Match history is authoritative and replayable.
6. Players can experience the same match differently through presentation preferences.
7. Creative and technical decisions should be tested rather than accepted on intuition.

## 1.3 V1 scope [A]

V1 will include:

- Local two-player chess on one device.
- A custom, dependency-free chess engine.
- Full standard chess rules and draw handling.
- Persistent piece identities and replayable match history.
- Contribution-based reactions:
  - Heroic pieces receive individual reactions.
  - Unknown pieces receive individual reactions.
  - Ordinary pieces are grouped.
- Quick Play and Cinematic presentation modes.
- A minimal text-based post-match Chronicle.
- The existing opening cinematic, ported and verified.
- Automated engine, narrative, replay, and presentation tests.

**Build sequence [A]:** Local two-player chess first. AI integration comes second, after the engine's legal-move and state-transition API has been verified.

## 1.4 Deferred scope [A]

- Online multiplayer: V1.5 or later.
- Full cinematic Chronicle.
- Strategic chess analysis.
- Stronger AI and additional difficulty levels.
- Ally reactions.
- Ambient non-capture dialogue.
- Extensive animation content.
- Server-side presentation acknowledgements.

V1 architecture must not unnecessarily prevent future online play, but online infrastructure is not a V1 implementation requirement.

---

# 2. Approved decision register

| ID | Decision | Status |
|---|---|---|
| D1 | Epic, serious tone with occasional dark humour; important moments must retain their weight. | [A] |
| D2 | Every victim speaks individually. Superseded by D26. | Superseded |
| D3 | Attacker and defender share dialogue pools, with occasional role-specific lines. | [A] |
| D4 | Reaction bubble duration is approximately 3 seconds; at most 2 visible simultaneously. Placement remains open. | [A] |
| D5 | Every reaction record is retained permanently in match history. | [A] |
| D6 | A notable capture is revenge, capturing a queen, or capturing a piece valued at least as highly as a rook. | [A] |
| D7 | Revenge means capturing the piece that captured one of your side's pieces on the immediately preceding ply. | [A] |
| D8 | Ally reactions are excluded from V1. | [A] |
| D9 | White is the attacker and moves first; Black is the defender. Selectable roles may come later. | [A] |
| D10 | Production uses a custom, dependency-free engine proven by tests. | [A] |
| D11 | Engine facts and narrative reaction records are separate layers. | [A] |
| D12 | Piece IDs persist through moves; promotion retains the pawn's ID. | [A] |
| D13 | Narrative selection is authoritative and deterministic; no `Math.random` in the narrative path. | [A] |
| D14 | Collaboration rules live in `AGENTS.md`: challenge with evidence, one round before escalation, owner decides, decisions are documented, done means tested, and handoffs are maintained. | [A] |
| D15 | Capturer reactions expire after 2 subsequent plies if stale. Mandatory Heroic and Unknown reactions never expire before first display. Backlogs of at least 2 use approximately 1.5-second compression. Minimum readable duration is established through playtesting. | [A] |
| D16 | Non-capture dialogue is deferred to V1.1. Events and ordinary chess visual feedback remain in V1. | [A] |
| D17 | Provisional phases: endgame when `piecesLeft <= 12` (takes precedence); otherwise earlygame when `fullMove <= 10`; otherwise midgame. Thresholds are configurable. | [A], provisional |
| D18 | Full standard draw rules: claimable threefold repetition and 50-move rule; automatic fivefold repetition and 75-move rule; stalemate; dead position; correct claim handling. | [A] |
| D19 | Presentation preferences affect presentation only, never chess state or authoritative history. | [A] |
| D20 | Quick Play uses text with minimal interruption. Players never wait for ordinary reactions before moving. | [A] |
| D21 | Mandatory reactions must be presented before the final result screen, without a maximum-delay cutoff. The authoritative result event itself is not delayed. | [A] |
| D22 | Online multiplayer is deferred to V1.5 or later. | [A] |
| D23 | Minimal text Chronicle ships in V1; full cinematic Chronicle is deferred. | [A] |
| D24 | Presentation preferences are independent per player. In local play on one device, there is one device setting. In future online play, each player's preference is selected at match start and locked for that match. | [A] |
| D25 | Ordinary captures are grouped. Each piece retains its identity and record. A lone Ordinary capture receives a one-piece group card. | [A] |
| D26 | Heroic and Unknown pieces receive individual reactions; Ordinary pieces are grouped. This supersedes D2. | [A] |
| D27 | Sacrifice and king-protection deaths qualify as Heroic when objectively and deterministically detected. | [A] |
| D28 | Contribution classification is frozen at death for live play. Chronicle may recognise later contributions retrospectively but cannot rewrite live classification or history. | [A] |
| D29 | V1 Narrative Beats are rule-based, deterministic, and derived from match history. Strategic detection is deferred. | [A] |
| D30 | The original prototype remains untouched. Production uses a separate engine. | [A] |
| D31 | Incorrect draw claims follow the approved procedure in §5.5. No clock penalty in V1; every attempt is recorded. | [A] |
| D32 | Complete dead-position detection is mandatory. It must not be silently weakened to a material-only approximation. | [A] |
| D33 | Chronicle is post-match, skippable, independent per player, never delays the result, and tells the story of both sides. Its length adapts to the match. | [A] |
| D34 | Local and single-player presentation mode switching is immediate. Future online preferences are locked at match start. | [A] |
| D35 | Cinematic mode uses the same text as Quick Play plus optional short animations in a separate panel. Animations never block moves or board updates, can be skipped or closed, and never replace text. | [A] |

---

# 3. Build order

## 3.1 Required V1 sequence [A]

1. **Chess engine:** legal moves, state transitions, piece IDs, event facts, draw rules, claims, replay, dead-position detection, and tests.
2. **Narrative resolver:** objective facts, contribution tiers, situations, deterministic selection, and version pins.
3. **Text presentation:** queue, grouping, result-screen rule, Quick Play, and Cinematic text.
4. **Opening cinematic:** port and verify the existing approved direction.
5. **AI integration:** only after the local engine API and perft gate are verified.
6. **Minimal Chronicle:** reconstruct the match story from authoritative history.
7. **Optional animation panel:** after the core game is stable.

## 3.2 Experiments

Unresolved presentation and classification details should be answered through the experiments in §12, not by repeatedly redesigning the specification.

---

# 4. Architecture and ownership

## 4.1 Three-layer architecture [A]

**Chess Engine → Narrative Resolver → Presentation**

- The engine owns chess legality, state, events, and results.
- The resolver interprets objective facts and creates reaction records.
- Presentation displays text, groups Ordinary reactions, and runs optional animations.

The engine must never depend on presentation preferences.

## 4.2 Separate lifecycles [T]

Keep these concepts separate:

1. Authoritative match history.
2. Narrative reaction records.
3. Derived Narrative Beats.
4. Client-side presentation scheduling.
5. Presentation completion status.

Text delivery, animation playback, and Chronicle content are independent lifecycles. Completing or skipping one must not accidentally complete or delete another.

## 4.3 File ownership [R]

One active writer per file.

| Module | Responsibility | Proposed owner |
|---|---|---|
| `engine` | RuleState, Match, events, draws | Codex |
| `deadposition` | Isolated dead-position detector | Codex |
| `resolver` | Facts, tiers, situations, grouping | Codex; Claude reviews specification |
| `config.json` | Configurable thresholds | Claude proposes; owner approves |
| `reactions.json` | Dialogue and personalities | ChatGPT |
| `ai` | Computer opponent | Codex |
| `ui` / `presentation` | Board and presentation queue | Codex |
| `cinematic` | Opening cinematic | Codex; ChatGPT assists with script |
| `chronicle` | Text Chronicle | Codex; ChatGPT assists with templates |

This ownership table is a workflow recommendation, not a product requirement. D14 remains authoritative.

---

# 5. Chess engine

## 5.1 State ownership [T]

**RuleState** contains all information needed to determine legal moves and adjudicate chess rules:

- Board position.
- Side to move.
- Castling rights.
- En passant state.
- Halfmove clock.
- Repetition context, including position counts and sufficient history to update or undo it.

RuleState must be fully cloneable.

**Match** contains:

- `matchId`.
- Initial match header and initial piece-ID registry.
- Current RuleState snapshot.
- Append-only authoritative event log.
- Piece identity registry and derived piece facts.
- Draw-claim history.
- Terminal result.
- Pinned rules, resolver, and content versions.

The event log is the durable history. The current RuleState is a replayable snapshot.

AI search clones the full RuleState only. It must never clone or mutate Match history, IDs, counters, reactions, or presentation state.

Use one legal-move generator and one move-application path for live play, intended-move claims, and AI simulations.

## 5.2 Chess rules [A]

The engine must correctly implement:

- All standard piece movement.
- Check and king safety.
- Checkmate and stalemate.
- Castling, including through-check restrictions and lost rights.
- En passant.
- Promotion to queen, rook, bishop, or knight.
- Pins and discovered attacks.
- Repetition and move counters.
- Standard draw rules and claim handling.

## 5.3 Piece identity [A]

- IDs are opaque strings, unique within a match, and never reused.
- IDs do not encode type or side.
- Normal moves transfer the ID.
- Castling moves both king and rook IDs.
- En passant removes the captured piece's ID from its actual square.
- Promotion retains the pawn's ID.

Piece facts are derived from the event log. Cached counters must equal a replay.

Derived facts include:

`origType`, `type`, `side`, `bornPly`, `promotedPly`, `moves`, `lastMovePly`, `kills`, `checkAnswers`, `checksGiven`, `supportedCaptures`, `diedPly`, and `killedBy`.

## 5.4 Authoritative events [T]

Event kinds are:

- `move`
- `claim`
- `result`

**Identifiers**

- `matchId` is generated once and stored in the match header.
- `eventSeq` increments for each authoritative move, claim, or result event.
- `ply` counts committed moves only; the first move is ply 1.
- Claims carry the number of completed plies at the time of the claim.
- Reactions use a separate `rseq` sequence.
- `commandId` may be reserved for future online support.

Canonical identities:

- Authoritative event: `(matchId, eventSeq)`.
- Reaction: `(matchId, rseq)`, with a source move-event ID.
- Presentation group: stable ID derived from the grouping-policy version and ordered member `rseq` values.

### Move event

The move event records objective facts, not narrative interpretation.

Required fields:

- `matchId`, `eventSeq`, `ply`, `fullMove`.
- `mover: { id, side, typeBefore, typeAfter }`.
- `from`, `to`.
- `castleSide`, optional rook movement.
- `promotionTo`.
- `captured`, including ID, type, side, actual square, and relevant piece facts.
- Move flags: en passant, gives check, gives mate.
- `checkers`: an array of checking piece IDs; empty when there are none, in canonical board-square order.
- `wasDefended`.
- `canRecapture`.
- `moverValue`, `capturedValue`.
- `supporters`.
- `pressure`.
- `answeredCheck`.
- `previousCapture`.
- `piecesLeft`.
- Post-move `halfmoveClock` and `repetitionCount`.

Definitions:

- `wasDefended`: geometric defence of the relevant capture square on the pre-capture board. Pins and x-rays are ignored in the V1 definition. En passant uses the landing square.
- `canRecapture`: a legal immediate recapture exists on the post-capture board.
- `supporters`: friendly pieces other than the capturer that had a legal capture of the victim's square immediately before the capture. Empty for en passant.
- `pressure`: the move gave check, or the moved piece geometrically attacks an enemy piece of equal or greater value from its new square. Pins are ignored.
- `answeredCheck`: describes how the preceding committed move answered check. It must not rely on the previous event being a move, because claims can occur between moves.
- `previousCapture`: records a capture on the immediately preceding ply for revenge evaluation.

Piece values: pawn 1, knight 3, bishop 3, rook 5, queen 9, king 4. These are narrative heuristic values, not chess-engine evaluation scores.

Non-captures use `null` for capture-only fields. `false` means the field applies but the condition is absent.

### Claim event

Required fields:

- `matchId`, `eventSeq`, `ply`.
- `claimant`.
- `basis`: `threefold` or `fifty_move`.
- `mode`: `current` or `intended_move`.
- `intendedMove`: normalised move including promotion where applicable; required for intended-move claims and null for current-position claims.
- `outcome`: `accepted`, `rejected_condition_not_met`, or `rejected_illegal_move`.
- `intendedMoveExecuted`: whether the legal intended move was subsequently played.

A claim event does not itself move a piece. When a false intended-move claim contains a legal move, record the rejected claim and the resulting move as separate linked events. Do not use `boardChanged` as a substitute for this distinction.

### Result event

Required fields:

- `matchId`, `eventSeq`, `ply`.
- `outcome`: checkmate, stalemate, draw, or resignation.
- `reason`: checkmate, stalemate, dead position, fivefold repetition, 75 moves, threefold claim, 50-move claim, or resignation.
- `winner`: White, Black, or null.

The match header must preserve the mapping between White/Black and attacker/defender. At most one terminal result event may exist per match.

### Replay

Replay begins with the stored initial position, initial piece-ID registry, pinned rules, and authoritative events.

- Rejected claims are retained in history.
- Rejected move commands are not recorded as committed moves.
- Replaying must reconstruct the same state, identities, claims, and result.

## 5.5 Draw rules [A]

| Rule | Behaviour |
|---|---|
| Threefold repetition | Claimable |
| Fifty-move rule | Claimable |
| Fivefold repetition | Automatic |
| Seventy-five-move rule | Automatic |
| Stalemate | Automatic |
| Dead position | Automatic |

**Repetition key:** piece placement by type and side, side to move, castling rights, and en passant only when a legal en passant capture exists. Piece IDs, clocks, and unrelated history are excluded.

The halfmove clock resets on pawn moves and captures.

Automatic outcomes are evaluated after each move. Checkmate takes precedence over the automatic 75-move draw. Other automatic outcomes must follow the applicable standard chess rules.

**Claims**

- Only the player to move may claim.
- Threefold repetition is claimable when the position has appeared, or would appear after the intended legal move, for at least the third time.
- The 50-move claim is available when the clock has reached 100 halfmoves, or would reach it after a qualifying intended move.
- A valid intended-move claim ends the game immediately. The declared move is not played, even if it would deliver checkmate.
- A false current-position claim is rejected; the board remains unchanged.
- A false claim with a legal intended move is rejected, and that move is played normally.
- An illegal intended move is rejected before claim evaluation.
- No time penalty is applied for an incorrect claim in V1.
- Every claim attempt is recorded with its basis, mode, and outcome.

The valid intended-move claim behaviour has been confirmed in Codex's FIDE review. Codex should verify remaining edge cases before implementation.

Resignation is recommended for V1. Draw offers and agreed draws are deferred to V1.1 unless the owner explicitly changes scope.

## 5.6 Dead-position detection [A requirement; implementation policy OPEN]

A position is dead when neither side can checkmate the other by any sequence of legal moves, cooperative or not.

A material-only approximation is not acceptable as the production solution.

### Required outcomes

- **LIVE:** a verified legal mating sequence exists for either side.
- **DEAD:** both sides have independently been proven unable to checkmate.
- **UNDETERMINED:** no mating witness has been found, but at least one side remains unresolved.

The detector must evaluate each intended mating side separately. Proving that White cannot mate does not prove that Black cannot mate.

### Proposed design [R]

Use an isolated detector with sound proof conditions:

1. Apply proven sufficient conditions for dead positions.
2. Search for a legal mating witness; a verified witness makes the position LIVE.
3. Apply sound blocked-position analysis only when its preconditions hold.
4. Use iterative-deepening search and a transposition table.
5. Return DEAD only when both sides are proven unable to mate.
6. If a time or node budget is reached without proof, return UNDETERMINED.

A budget stop must never be treated as proof of a draw.

### Formal rules model [OPEN]

Codex identified an unresolved question: the draft's statement that clocks and history are ignored may conflict with the use of automatic draw rules when assessing hypothetical mating sequences.

Before claiming complete standard-rule compliance, define whether the detector models:

- Abstract legal mate reachability without automatic draw termination; or
- Reachability under the full game rules, including automatic 75-move and fivefold termination.

The halfmove clock and repetition context may matter under the second interpretation. This must be resolved through technical research and a documented rules model.

### UNDETERMINED policy [OPEN]

Two possible policies:

1. Continue analysis before accepting the next move, preserving the full-rules requirement but potentially delaying play.
2. Accept a documented unresolved gap. This would be a deviation from the approved full-standard-rules requirement and requires explicit owner approval.

Do not silently select option 2.

### Research corrections

The reviewed paper's quick method missed 3 of 90,546 positions in its reported dataset, not 3 of 84,100. The reported average and maximum timings belong to the authors' particular C++ implementation and sample; they are not JavaScript or low-end-device performance guarantees.

Claude's scratch Python measurements remain unverified until reproduced with a stated rules implementation and corpus.

Paper-based implementation requires appropriate attribution. Reusing reference code requires a pinned commit and license review. Codex identified CHA-Solver at commit `3484c7e65247003fac8705a9290dc2b5d0978b94` as MIT and Ashlar Chess at commit `7c768f516bff7b56323330abd4011b71bba335dd` as GPL-3. These are reviewed references, not automatic implementation dependencies.

---

# 6. Narrative system

## 6.1 Principles [A]

The resolver consumes authoritative facts. It never decides legality or match results.

V1 uses deterministic, objectively verifiable facts rather than strategic evaluation.

Same input and pinned versions must produce byte-identical output.

## 6.2 Capture situations [R pending approval of exact priority]

Situations determine which line is appropriate when a piece qualifies for an individual reaction.

- **trade:** a capture where a legal immediate recapture exists.
- **unrecapturable:** a capture where no legal immediate recapture exists. Whether the square was geometrically defended remains a separate fact.
- **king_protection:** a non-king piece answered check by blocking or capturing the checker on the preceding committed move and is captured now.
- **sacrifice_candidate:** the victim moved on the preceding ply, its value exceeds the capturer's value, no legal immediate recapture exists, and the preceding move had qualifying pressure. This is a heuristic, not proof of intent.
- **en_passant:** the capture is en passant.
- **queen_fall:** the captured piece is a queen.

The exact situation-priority order must be carried forward from the approved decision record. It must not be silently demoted to a recommendation during editing. If approval evidence for a particular ordering cannot be found, flag that ordering for the owner rather than inventing approval.

## 6.3 Contribution tiers [A]

Every captured piece is classified at death:

- **Heroic:** qualifies through objectively supported contribution, such as a verified prior kill, qualifying check response, king-protection death, or qualifying sacrifice-candidate death.
- **Unknown:** not Heroic, but has objective `supportedCapture` evidence meeting the configured threshold.
- **Ordinary:** neither Heroic nor Unknown.

Classification is frozen at death for live play.

Unknown does not mean missing or corrupt history. Incomplete or invalid authoritative history is a data-integrity error, not an Unknown tier.

## 6.4 Supported captures [T; threshold OPEN]

A supporting piece is evidence of a legal capture opportunity against the victim immediately before its capture by an ally. It is not proof that the supporting piece caused the capture.

The resolver must distinguish legal captures from pseudo-legal attacks. Pinned pieces that cannot legally capture must not be counted.

The default threshold proposed in v0.4 is victim value at least 3 and at least one supporting piece. This remains a recommendation pending the classification simulator.

The event field `supporters` and derived counter `supportedCaptures` must use one consistent definition and direction.

## 6.5 Capturer reactions [A triggers; priority approval to verify]

A capturer may speak when the capture is notable:

1. Revenge.
2. Queen captured.
3. Captured value at least rook.

Only one capturer reaction is produced per capture.

The proposed priority is revenge, then queen capture, then major capture. Its approval status must be checked against the historical decision record; do not silently label a recommendation as approved.

## 6.6 Deterministic selection [T]

- No random selection.
- Fallback order must be fixed and documented.
- Candidate lines must have deterministic ordering.
- Reuse of lines must be deterministic and reconstructible from history.
- Used-line scope is per match and shared across both sides.
- Prefer globally unique `lineId`; otherwise use `(poolId, lineId)`.
- LRU recency is replayed by reaction order, never wall-clock time.

FNV-1a 32-bit is acceptable as a deterministic selection hash, not as a security mechanism.

The canonical byte format must specify:

- Field order.
- UTF-8 encoding.
- Encoding of `ply`.
- Length-prefix width and endianness.
- String constraints.
- Unsigned overflow behaviour.
- Cross-runtime test vectors.

A statement that input is simply "canonical UTF-8" is insufficient without these details.

## 6.7 Reaction records [T]

Every capture must retain its classification and narrative record in authoritative narrative history, including Ordinary captures. Ordinary captures do not require individual visible dialogue; their records are represented through grouping.

Reaction records should include:

- Match and reaction identity.
- Source move-event identity.
- Ply.
- Speaker piece ID and role.
- Situation and tags.
- Contribution tier.
- Selected line ID and text.
- Content and resolver version.
- Fallback information.
- Group membership or representation status, where applicable.

Victim reactions are ordered before capturer reactions on the same ply.

---

# 7. Dialogue content

## 7.1 Tone and personalities [A]

- Epic and serious by default.
- Occasional dark humour.
- Important sacrifices and decisive moments must retain emotional weight.
- Attacker and defender share most dialogue pools.
- Occasional role-specific lines are permitted.
- Ally reactions are excluded from V1.

## 7.2 Content guidelines [R]

- Keep individual reaction lines concise; target fewer than 12 words.
- Give each piece type and personality a recognisable voice.
- Avoid repetitive lines and generic filler.
- Build enough lines per situation and piece type to reduce obvious repetition.
- Grouped Ordinary presentation should retain the feeling that individual pieces mattered without forcing every Ordinary piece to speak.

---

# 8. Presentation system

## 8.1 Separation [T]

Text delivery, animation playback, and Chronicle rendering must have independent state and lifecycle management.

Presentation must never block legal moves, alter authoritative state, or delay the authoritative result event.

## 8.2 Reaction queue [A]

- FIFO ordering by ply.
- Victim reaction before capturer reaction on the same ply.
- At most 2 visible bubbles.
- Approximate normal bubble duration: 3 seconds.
- Capturer reactions expire after 2 subsequent plies if stale.
- Mandatory Heroic and Unknown reactions never expire before first display.
- When backlog is at least 2, compress display duration to approximately 1.5 seconds.
- Minimum readable duration is determined through playtesting.

The queue must retain enough information to recover after reload and must not silently lose mandatory reactions.

## 8.3 Completion states and watermark [T]

Proposed statuses:

- `pending`
- `presented`
- `representedByGroup`
- `expired` — for eligible non-mandatory capturer reactions only
- `dismissed` — after display has begun, subject to the unresolved dismissal rule

The watermark advances only across contiguous terminal reactions. Merely storing or receiving a reaction does not mean it has been presented.

For grouped Ordinary reactions, the group card must explicitly represent its ordered member reaction IDs. The group needs a stable ID derived from the grouping-policy version and ordered member `rseq` values.

A grouped card's display must resolve every member it represents according to a documented minimum display rule.

**[OPEN]** Decide whether a player dismissing a mandatory reaction after it begins counts as completed for the result-screen rule, even if its minimum readable duration has not elapsed. The approved requirement is that mandatory reactions must be presented before the result screen; this detail must not be assumed.

## 8.4 Ordinary grouping [A grouping; policy OPEN]

Ordinary captures are grouped. A single Ordinary capture receives a one-piece group card.

Two grouping strategies remain experimental:

- **P1:** A fixed grouping window ending at `firstPly + 2`.
- **P2:** Show a group immediately and extend it as further Ordinary captures arrive.

Compare both strategies using identical match histories. Select the policy based on readability, delay, and clarity.

The group card must represent every included member and preserve their individual identities and records.

## 8.5 Result screen [A]

- The authoritative result event is recorded immediately when the chess game ends.
- The final result screen waits for mandatory Heroic and Unknown reactions to be presented.
- Ordinary group cards must also be resolved before the final result screen if they represent captured pieces from that match.
- There is no maximum-delay cutoff.
- Chess state and the authoritative result are never held hostage by presentation.
- The worst-case wait must be measured.

## 8.6 Quick Play [A]

- Text reactions only.
- Minimal interruption.
- No waiting for ordinary reactions before a player can move.
- Same narrative facts and history as Cinematic mode.

## 8.7 Cinematic mode [A]

- Same text reactions as Quick Play.
- Optional short animations in a separate panel.
- Animations can be skipped or closed.
- Animations never block moves or board updates.
- Animations never replace text.
- Animation failure or overload must never cause text to be dropped.

Animation trigger events and fatigue rules remain open for later testing.

## 8.8 Preferences and mode switching [A]

- Preferences affect presentation only.
- In local and single-player modes, switching presentation mode is immediate.
- A switch must preserve queued reactions and must not lose mandatory text.
- Future online players have independent preferences selected at match start and locked for that match.
- Presentation settings never alter chess rules, match state, or narrative generation.

## 8.9 Text placement [OPEN]

Compare playable speech bubbles with a side feed or hybrid. The owner selects after testing.

---

# 9. Opening cinematic and Chronicle

## 9.1 Opening cinematic [A]

The opening is approximately one minute, with first-person perspectives from both sides.

It is skippable. It must not affect chess state or legal move timing.

The established final line is:

"It's all in your hands, chief. Defend the king."

The existing approved cinematic direction should be ported and verified without modifying the original prototype.

## 9.2 Chronicle [A]

- Minimal text-based post-match Chronicle ships in V1.
- It is skippable.
- It is independent per player.
- It never delays the result screen.
- It tells the story of both sides.
- Length adapts to match duration and meaningful events.
- It is reconstructed from authoritative history and derived Narrative Beats.
- It may recognise later contributions retrospectively but cannot rewrite live classifications or history.

Whether V1 ships two separately selectable perspective versions, rather than one Chronicle that tells both sides' story, remains open.

Full cinematic Chronicle is deferred.

---

# 10. Future online compatibility

Online multiplayer is V1.5 or later. V1 does not implement server rooms, reconnect handling, server acknowledgements, or online infrastructure.

V1 should nevertheless avoid unnecessary coupling that would prevent future authoritative server execution.

Future online requirements may include:

- Server-authoritative chess state and event generation.
- Idempotent event handling.
- Reconnection and replay.
- Per-player presentation preferences.
- Server-side presentation acknowledgements where required.

These are future architecture considerations, not V1 delivery requirements.

---

# 11. Testing and acceptance criteria

## 11.1 Engine tests [T]

- Perft against known standard positions.
- Legal move generation and king safety.
- Castling, en passant, promotion, pins, and discovered attacks.
- Correct halfmove clock and repetition handling.
- Threefold, fivefold, 50-move, 75-move, stalemate, and checkmate precedence.
- Correct current-position and intended-move claims.
- Replay equality.
- Unique persistent IDs and promotion identity.
- AI search cannot mutate Match history or IDs.

## 11.2 Dead-position tests [T]

- Both sides assessed independently.
- Zero false `DEAD` results under the proof conditions.
- `LIVE` witnesses replay through the production legal-move engine.
- `UNDETERMINED` never ends the game as a draw.
- Include same-colour bishops, opposite-colour bishops, knight combinations, blocked positions, castling rights, and en passant.
- Include exhaustive small-material cases and paper fixtures.
- Report runtime and memory distributions on a stated low-end device.

## 11.3 Narrative tests [T]

- Deterministic classification and selection.
- Classification frozen at death.
- Objective supporter evidence; pinned pieces excluded when their captures are illegal.
- Sacrifice and king-protection detection on constructed positions.
- Revenge positive and negative cases.
- `answeredCheck` for block, capture, king move, and double check.
- King protection never assigned to a king.
- Phase precedence.
- Identical selection across repeated runs and across Node and browser.
- Fallback order and line reuse deterministic.
- Heroic and Unknown reactions cannot disappear before first display.

## 11.4 Presentation tests [T]

- Player input is never blocked.
- Animation skipping or overload never drops text.
- Result follows required reaction presentation.
- Mode switching loses no reactions.
- Reload loses no mandatory reaction and creates no duplicate presentation on the same device.
- Group cards resolve the correct member reactions.
- Chronicle rebuilds from history.

## 11.5 First playable acceptance criteria [A/T]

1. A complete local two-player game can be played.
2. Required chess and draw tests pass.
3. Persistent identities remain correct.
4. Replay reconstructs the same final state.
5. Classification and line selection are reproducible.
6. Heroic and Unknown deaths show individual text.
7. Ordinary deaths show grouped text, including one-piece cards.
8. Presentation never blocks input or changes authoritative state.
9. The result screen follows required presentation completion.
10. Reload loses no mandatory reaction.
11. A minimal text Chronicle renders for a finished match.
12. Dead-position detection meets its approved correctness and policy requirements before V1 is declared fully standard-rules complete.
13. The original prototype remains untouched and its canonical preservation baseline is documented.

---

# 12. Experiments

| # | Experiment | Success criteria |
|---|---|---|
| 1 | Perft gate | Standard positions match at target depths. |
| 2 | Random-game property tests | At least 1,000 games; replay equality, unique IDs, and no history mutation during AI search. |
| 3 | Dead-position spike | Frozen corpus, both sides evaluated, proof conditions verified, witnesses replayed, runtime/memory distributions reported, and UNDETERMINED share measured. |
| 4 | Classification simulator | At least 50 real games; report Heroic, Unknown, and Ordinary shares, silent captures per game, and longest silent run. Owner reviews 10 transcripts. |
| 5 | Result-delay test | A 30-capture history; measure worst-case mandatory presentation delay. |
| 6 | Text placement | Compare speech bubbles, side feed, and hybrid. |
| 7 | Grouping P1 vs P2 | Compare latency, duration, readability, and clarity on identical histories. |
| 8 | Readability and compression | Establish minimum readable duration and validate the 1.5-second backlog compression. |
| 9 | Determinism | Byte-identical reactions across runs and across Node/browser. |
| 10 | Reload test | At least 100 simulated matches; reload at random points, with no mandatory reaction omitted or duplicated. |
| 11 | Animation panel | Test frame time on a weak device, skip rate, and attention impact after core stability. |

For the dead-position experiment, freeze the corpus, source versions, seeds, oracle versions, rules semantics, and search limits. Report performance quantiles and unresolved cases by corpus category. Differential testing alone is not a proof of correctness.

---

# 13. Known simplifications and risks

- `wasDefended` ignores pins and x-rays in its V1 definition.
- `sacrifice_candidate` is a heuristic and can misclassify intent.
- `supporters` can inflate Unknown classification if thresholds are too permissive.
- Dead-position detection may be expensive on contrived positions.
- Content volume is a major creative cost; build thin and expand.
- Attention load from board, text, and animation panel requires playtesting.
- The prototype's AI, draw logic, and reaction randomness are not correctness targets.
- The original prototype has two known copies with different SHA-256 hashes:
  - Downloaded copy: `2C30E1FA…EFF2D6BF`
  - Checked-in copy: `12581522…FE862C08`
  
  Both must remain untouched. The canonical preservation baseline must be designated before a byte-identical acceptance check can be meaningful.

---

# 14. Open items and implementation blockers

## 14.1 Owner decisions still open

1. Dead-position `UNDETERMINED` policy, after experiment 3.
2. Acceptable Heroic, Unknown, and Ordinary shares, after experiment 4.
3. Text placement.
4. Animation trigger events.
5. Whether V1 offers two separately selectable Chronicle perspectives.
6. Whether dismissal after display begins counts as completion for the result-screen rule.
7. Minimum readable duration for mandatory reactions.
8. Whether Ordinary grouping uses P1 or P2.
9. Whether resignation is included in V1; recommendation is yes.
10. Whether any draw-offer functionality is brought forward from V1.1.

## 14.2 Technical items for Codex

1. Resolve the formal dead-position rules model.
2. Specify the exact RuleState representation and repetition-context update/undo.
3. Define initial piece-ID assignment and match-header schema.
4. Finalise event schema, claim linkage, and canonical event identity.
5. Define `supporters` and `supportedCaptures` consistently, including pinned-piece tests.
6. Complete canonical FNV-1a byte serialization and test vectors.
7. Define grouped-card member completion and watermark behaviour.
8. Verify remaining FIDE claim edge cases.
9. Confirm move-fact semantics for `pressure`, `wasDefended`, `canRecapture`, and en passant.
10. Confirm test framework and module boundaries.

## 14.3 Historical decision traceability

The v0.3 and v0.4 drafts do not consistently label the victim situation-priority order and capturer-priority order as approved versus recommended.

Do not silently downgrade an owner-approved decision or silently upgrade a recommendation. Check the earlier decision record. If approval cannot be established, present the exact ordering to the owner.

## 14.4 Repository cleanup

The repository contains older specification and status documents that may contradict this draft. `AGENTS.md` also needs the approved collaboration rules.

No cleanup or implementation should happen until the owner approves the final specification. The original prototype must remain untouched.

---

# 15. Revision 2 change log

Compared with v0.4:

1. Restored the explicit owner-approved build order: local two-player first, AI second.
2. Preserved independent presentation preferences per player and the approved future-online match-start lock.
3. Clarified that online infrastructure is deferred to V1.5+ and is not a V1 implementation requirement.
4. Standardised on `matchId`.
5. Made RuleState the single owner of the halfmove clock and repetition context, with Match holding the replayable snapshot and durable event history.
6. Separated authoritative `eventSeq` from narrative `rseq`.
7. Clarified claim-event semantics and separate move recording for a false claim with a legal intended move.
8. Added initial piece-ID registry and White/Black-to-role mapping to replay requirements.
9. Required two-sided dead-position proof and corrected the paper's quick-method miss count.
10. Added the unresolved formal rules-model question for dead-position detection.
11. Clarified canonical hash serialization requirements.
12. Added explicit grouped-card identity and watermark requirements.
13. Preserved the requirement that Ordinary group cards resolve before the final result screen, subject to precise completion semantics.
14. Preserved the original prototype and documented the two conflicting hashes without modifying either copy.
15. Distinguished approved decisions, technical requirements, recommendations, and unresolved questions more explicitly.

---

**End of SPEC v0.4 Revision 2 — Draft for Owner Approval**

**Implementation remains blocked until the owner approves this specification.**
