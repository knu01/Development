# The Last Stand — Decision Register

**Last updated:** 2026-11-09
**Authority:** The owner has final authority. Revision 2 of the V1 Specification is owner-approved by later owner instruction even though the supplied file retains a draft footer. This register records decisions and status; it does not amend the SPEC.

**Team responsibility update (owner, 2026-11-09):** Codex is Engineering Lead for Engine/rules, Match/adjudication, dead-position detection, game state/authoritative events, AI/multiplayer, backend architecture/tests, performance, and correctness. Claude owns frontend, visual design, UI/UX, animations, and presentation. Cross-boundary work uses documented APIs and event contracts; frontend never decides legality or authoritative results. This supersedes historical role descriptions.

Status labels: **Approved** = owner-approved; **Implemented** = implemented and accepted for a milestone; **Technical requirement** = required by approved scope; **Recommendation** = agent proposal not approved; **Open** = owner decision or experiment remains.

## Owner-approved product and workflow decisions

Approval dates are given only where the source record identifies one; otherwise “approved by 2026-11-08” is a latest-known bound, not an invented approval date.

| ID | Decision | Status / rationale |
|---|---|---|
| D1 | Serious, epic tone with occasional dark humour; decisive sacrifices and events retain their weight. | Approved; latest confirmed by 2026-11-08. |
| D2 | Early proposal that every victim speaks individually. | **Superseded by D26.** |
| D3 | Attacker/defender share most dialogue pools, with occasional role-specific lines. | Approved. |
| D4 | Reaction text is concise; target about 3 seconds, at most two visible bubbles. Placement and readable minimum remain open. | Approved / details open. |
| D5 | Every reaction record is retained in match history. | Approved. |
| D6 | Notable capture triggers: revenge, capturing a queen, or capturing a piece valued at least as highly as a rook. | Approved. |
| D7 | Revenge is capturing the piece that captured one of the capturer's side on the immediately preceding ply. | Approved. |
| D8 | Ally reactions are excluded from V1. | Approved. |
| D9 | White is attacker and moves first; Black is defender; roles do not change chess rules. | Approved. |
| D10 | Production uses a custom dependency-free-at-runtime chess engine proven by tests. | Approved and implemented through M3.2 (dead-position detection outstanding). |
| D11 | Engine facts and narrative reaction records are separate layers. | Approved; architecture boundary. |
| D12 | Piece IDs persist through moves; promotion preserves the pawn's ID. | Approved and implemented in Match. |
| D13 | Narrative selection is authoritative and deterministic; no random narrative decisions. | Approved; Resolver not yet implemented. |
| D14 | Agents challenge with evidence, preserve decisions, escalate after one unresolved exchange, document decisions, test before claiming completion, and maintain handoffs. | Approved; see [AGENTS.md](../../AGENTS.md). |
| D15 | Capturer reactions may expire after two subsequent plies if stale; mandatory Heroic/Unknown reactions never expire before first display. Backlogs of at least two compress toward 1.5 seconds; the readable minimum is playtested. | Approved; queue not implemented. |
| D16 | Non-capture dialogue is deferred to V1.1; ordinary chess visual feedback remains in V1. | Approved. |
| D17 | Configurable provisional phases: endgame when `piecesLeft <= 12` (precedence), otherwise earlygame when `fullMove <= 10`, else midgame. | Approved direction; values provisional/configurable. |
| D18 | Full standard draw rules in V1: claimable threefold and 50-move; automatic fivefold and 75-move; stalemate; dead position; correct claims. | Approved; M3.2 implements all except dead-position detection. |
| D19 | Presentation preferences affect presentation only, never chess rules, legal moves, match state, or authoritative history. | Approved. |
| D20 | Quick Play uses text with minimal interruption; players do not wait for ordinary reactions before moving. | Approved; not implemented. |
| D21 | Authoritative result is recorded immediately; final result screen waits for required mandatory reactions, without a cutoff. | Approved; queue/result UI not implemented. |
| D22 | Online multiplayer is deferred to V1.5 or later. | Approved. |
| D23 | Minimal text Chronicle is V1; full cinematic Chronicle is deferred. | Approved; not implemented. |
| D24 | Presentation is independent per player; local same-device play has one device setting; future online preferences are selected at match start and locked. | Approved. |
| D25 | Ordinary captures are grouped, preserving each piece's identity/history; a single Ordinary capture gets a one-piece card. | Approved; exact grouping policy remains open. |
| D26 | Heroic and Unknown pieces receive individual reactions; Ordinary pieces are grouped. Supersedes D2. | Approved. |
| D27 | Sacrifice and king-protection deaths qualify as Heroic when objectively and deterministically detected. | Approved. |
| D28 | Contribution classification freezes at death for live play. Chronicle may retrospectively recognise later contributions without rewriting live history/classification. | Approved. |
| D29 | V1 Narrative Beats use deterministic rules from match history; strategic detection is deferred. | Approved. |
| D30 | Preserve the original prototype untouched; production uses a separate engine. | Approved. |
| D31 | Incorrect draw claim procedure: reject wrong current-position claim and continue; for a wrong claim with a legal intended move, execute that move normally; reject illegal intended move before claim evaluation; no clock penalty in V1; record every attempt. | Approved no-clock adaptation; M3.2 implemented. |
| D32 | Complete dead-position detection is mandatory; material-only approximation cannot silently replace it. | Approved; experimental detector/integration progress exists, but complete implementation and acceptance remain outstanding. |
| D33 | Chronicle is post-match, skippable, independent per player, does not delay result, covers both sides, and adapts length to match/events. | Approved; implementation outstanding. |
| D34 | Local/single-player mode switching is immediate; future online preferences lock at match start. | Approved. |
| D35 | Cinematic uses the same text as Quick Play plus optional short animations in a separate panel. Animations are skippable/closable, never block moves/board updates, and never replace text. | Approved; animation details remain open. |

### Further owner-confirmed decisions

- **Approved dialogue priority orders (2026-11-07, per Claude handoff):** victim: `king_protection > sacrifice_candidate > en_passant > queen_fall > unrecapturable > trade > pawn_journey > generic`; capturer: `revenge > queen_taken > major_capture`, one capturer reaction per capture.
- **Pawn tags (2026-11-07 handoff):** configurable `fresh_recruit` before full move 10, `veteran` alive at least 20 full moves, `advanced` on opponent's half, `home_guard` never moved. Resolver implementation and configuration remain outstanding.
- **M3.2 architecture amendment:** Match is the owner/source of actual repetition history. Engine receives history explicitly for pure evaluation. This supersedes older handoff/spec proposals that put repetition context inside `RuleState`; implemented and accepted in M3.2.
- **M3.2 scope:** resignation is not implemented; do not import the older proposal to include it. `assessMatingPotential` remains explicitly unimplemented; no guessed dead/live result.
- **M3.3 authorization (2026-11-08):** implement pending adjudication and complete dead-position detection. While the result is `UNDETERMINED`, continue analysis in the background, block subsequent move commitment, and release play only after definitive `LIVE` or `DEAD`. `LIVE` requires a verified legal checkmate witness; `DEAD` requires independent proof that neither side can mate. No material-only shortcut or guessed outcome.
- **M3.3 progress (2026-11-09):** bounded exhaustive detector, terminable browser worker, pending Match gate, adjudication events, and replay verification are implemented experimentally. Resource exhaustion and cancellation remain pending; retries restart from the root. Measurements show unresolved positions under current limits. This is not M3.3 completion or V1 chess-rule completeness.
- **Technology/production architecture:** TypeScript, Vite, Vitest, browser-native UI, no React or game engine for now, runtime dependency-free chess engine. Approved before M1; see [architecture](../architecture/ARCHITECTURE.md).

## Technical requirements accepted by the owner

- Immutable engine transitions; one canonical move legality/application path; Match must not duplicate chess rules.
- Stable opaque piece IDs are Match-owned, not derived from Engine object identity; promotion preserves the pawn ID.
- Authoritative `eventSeq` and narrative `rseq` are separate; move, claim, and result events are replay-verifiable.
- Engine position identity includes legal en-passant availability and castling rights; excludes clocks and piece IDs. Match stores real repetition history; FEN begins with only the present position.
- Checkmate precedes the 75-move automatic draw.
- `UNDETERMINED` is not proof of deadness and cannot silently become a draw. `DEAD` requires sound proof for both sides; `LIVE` needs a legal mating witness.
- Narration and presentation are separate lifecycles from authoritative chess state. Animation/text/Chronicle completion cannot delete or alter one another's records.
- Both preserved prototype files remain read-only. Owner alone commits and pushes.

## Implemented milestone status

M1, M2.1, M2.2, M2.3, M3.1, and M3.2 are complete and accepted for their documented scopes. M2.4 is accepted for depths 1–3 on six published positions; deeper perft is not verified. See [development history](DEVELOPMENT_HISTORY.md) for detailed evidence. These are status records, not newly created product decisions.

## Agent recommendations and proposals — not owner decisions

- Dead-position implementation may use the Ambrona paper's layered algorithm; bounded search may return `UNDETERMINED`. The precise formal model, implementation, limits, and fallback are not settled.
- Candidate Unknown rule in Revision 2: non-Heroic piece with objective `supportedCapture` evidence; suggested victim-value threshold 3 and at least one supporter remains a recommendation pending simulation.
- Candidate Ordinary grouping policies P1 (fixed window to `firstPly + 2`) and P2 (show immediately, extend) remain experimental.
- FNV-1a 32-bit may select deterministic dialogue candidates but is not security-grade. Exact canonical encoding and test vectors remain technical work, not an implemented feature.
- The proposed architecture ownership table assigns one active writer per file. It is workflow guidance, not a product mechanic.

## Open owner decisions and experiments

| Item | Why it remains open / evidence needed |
|---|---|
| Dead-position detector performance | The strict `UNDETERMINED` policy is approved. 2026-11-09 measurements: K+N-v-K and Buchanan a4 remain `UNDETERMINED` at 10 seconds; same-colour K+B-v-K+B also remains unresolved. Measure resumable background work, low-end-device time and memory, and corpus `UNDETERMINED` rates; do not weaken the policy. Full measurements are in [Development History](DEVELOPMENT_HISTORY.md). |
| Formal dead-position model and search limits | Technical work; soundness/completeness and runtime must be established. |
| Heroic/Unknown/Ordinary acceptable shares and supporter threshold | Classification simulator over at least 50 real games; owner reviews 10 transcripts (SPEC Experiment 4). |
| Ordinary grouping P1 vs P2 | Compare latency/readability/clarity on identical histories. |
| Text placement | Compare speech bubbles, side feed, and hybrid through play. |
| Mandatory reaction dismissal/minimum readable duration | Clarify whether dismissal after display begins satisfies result-screen completion, then measure readability. |
| Animation trigger events/fatigue | Experiment after core play is stable. |
| Chronicle perspectives | SPEC asks whether two selectable perspective versions are offered; not decided. |
| Resignation in V1 | Revision 2 lists as open; M3.2 excludes it. Requires owner decision before implementation. |
| Draw offers/agreed draws | Deferred to V1.1 unless owner brings them forward. |
| Exact current SPEC repository location | Revision 2 is approved but the supplied copy is outside the repository; owner should place the canonical copy in the repo. |
