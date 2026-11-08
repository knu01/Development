import { isInCheck, legalMoves } from '../engine';
import type { Move, MoveInput, PieceType, PromotionPieceType, Side } from '../engine';
import { claimDraw, commitMove, createMatch } from '../match';
import type { Match, MatchEvent } from '../match';

const glyph: Record<Side, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};
const names: Record<PieceType, string> = { king: 'King', queen: 'Queen', rook: 'Rook', bishop: 'Bishop', knight: 'Knight', pawn: 'Pawn' };
const letter: Record<PieceType, string> = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' };
const promotions: readonly PromotionPieceType[] = ['queen', 'rook', 'bishop', 'knight'];
const squareName = (square: number) => `${String.fromCharCode(97 + square % 8)}${8 - Math.floor(square / 8)}`;

export function mountGame(root: HTMLElement) {
  let gameNumber = 1;
  let match = createMatch({ gameId: `local-${gameNumber}` });
  let selected: number | null = null;
  let pendingPromotion: Move[] = [];
  let notice = '';

  root.innerHTML = `<div class="shell">
    <header class="topbar"><a class="wordmark" href="#">THE LAST STAND</a><span class="edition">LOCAL MATCH · CLASSIC CHESS</span></header>
    <main class="layout">
      <section class="play-area" aria-label="Chess game">
        <div class="game-heading"><div><p class="eyebrow">THE BATTLEFIELD</p><h1>Hold the line.</h1></div><button class="button quiet" data-action="restart">New game</button></div>
        <div class="turn-card" data-role="status"></div>
        <div class="board-frame"><div class="board" role="grid" aria-label="Chess board" data-role="board"></div></div>
        <div class="claim-row"><button class="button quiet" data-claim="threefold">Claim threefold draw</button><button class="button quiet" data-claim="fifty_move">Claim 50-move draw</button></div>
        <p class="notice" data-role="notice" aria-live="polite"></p>
      </section>
      <aside class="side-panel">
        <section class="panel"><p class="eyebrow">THE RECORD</p><h2>Move history</h2><ol class="history" data-role="history"></ol></section>
        <p class="footnote">Standard chess rules. The battle is only in the telling.</p>
      </aside>
    </main>
    <dialog class="promotion-dialog" data-role="promotion"><form method="dialog"><p>Choose your promotion</p><div class="promotion-options"></div><button class="button quiet" value="cancel">Cancel</button></form></dialog>
  </div>`;

  const board = root.querySelector<HTMLElement>('[data-role="board"]')!;
  const status = root.querySelector<HTMLElement>('[data-role="status"]')!;
  const history = root.querySelector<HTMLOListElement>('[data-role="history"]')!;
  const noticeNode = root.querySelector<HTMLElement>('[data-role="notice"]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-role="promotion"]')!;

  function resultText() {
    if (!match.result) return '';
    if (match.result.reason === 'checkmate') return `${match.result.outcome === 'white_win' ? 'White' : 'Black'} wins by checkmate`;
    const labels: Record<string, string> = { stalemate: 'Stalemate', fivefold_repetition: 'Draw by fivefold repetition', seventy_five_moves: 'Draw by the 75-move rule', dead_position: 'Draw by dead position', threefold_claim: 'Draw by threefold claim', fifty_move_claim: 'Draw by 50-move claim' };
    return labels[match.result.reason] ?? 'Game over';
  }

  function render() {
    const finished = match.status === 'finished';
    const checked = !finished && isInCheck(match.state, match.state.sideToMove);
    status.innerHTML = finished
      ? `<strong>${resultText()}</strong><span>Game complete</span>`
      : `<strong>${checked ? 'Check — ' : ''}${match.state.sideToMove === 'white' ? 'White' : 'Black'} to move</strong><span>Move ${match.state.fullmoveNumber}</span>`;
    board.replaceChildren();
    const legalTargets = selected === null ? [] : legalMoves(match.state, selected);
    for (let square = 0; square < 64; square += 1) {
      const piece = match.state.board[square];
      const button = document.createElement('button');
      button.type = 'button'; button.className = `square ${(Math.floor(square / 8) + square % 8) % 2 ? 'dark' : 'light'}`;
      button.dataset.square = String(square); button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${squareName(square)}${piece ? ` ${piece.side} ${names[piece.type]}` : ''}`);
      if (selected === square) button.classList.add('selected');
      if (legalTargets.some((move) => move.to === square)) button.classList.add('legal-target');
      if (square % 8 === 0) button.insertAdjacentHTML('beforeend', `<span class="coordinate rank">${8 - Math.floor(square / 8)}</span>`);
      if (Math.floor(square / 8) === 7) button.insertAdjacentHTML('beforeend', `<span class="coordinate file">${String.fromCharCode(97 + square % 8)}</span>`);
      if (piece) button.insertAdjacentHTML('beforeend', `<span class="piece ${piece.side}">${glyph[piece.side][piece.type]}</span>`);
      button.addEventListener('click', () => clickSquare(square)); board.append(button);
    }
    history.replaceChildren();
    const moves = match.events.filter((event): event is Extract<MatchEvent, { kind: 'move' }> => event.kind === 'move');
    for (let i = 0; i < moves.length; i += 2) {
      const li = document.createElement('li'); li.dataset.ply = String(moves[i].ply);
      li.innerHTML = `<span>${Math.ceil(moves[i].ply / 2)}.</span> ${formatMove(moves[i].move)}${moves[i + 1] ? ` <span class="black-move">${formatMove(moves[i + 1].move)}</span>` : ''}`;
      history.append(li);
    }
    noticeNode.textContent = notice;
  }

  function formatMove(move: Move) {
    if (move.castle) return move.castle === 'kingSide' ? 'O-O' : 'O-O-O';
    return `${letter[move.piece.type]}${squareName(move.from)}${move.capture ? '×' : '–'}${squareName(move.to)}${move.promotion ? `=${letter[move.promotion]}` : ''}${move.givesCheck ? '+' : ''}`;
  }

  function commit(input: MoveInput) {
    const transition = commitMove(match, input);
    if (!transition.ok) { notice = 'That move is not legal.'; selected = null; render(); return; }
    match = transition.match; selected = null; notice = ''; render();
  }

  function choosePromotion(moves: Move[]) {
    const options = dialog.querySelector('.promotion-options')!;
    options.replaceChildren();
    for (const type of promotions) {
      const button = document.createElement('button'); button.className = 'promotion-choice'; button.type = 'button';
      button.textContent = `${glyph[match.state.sideToMove][type]} ${names[type]}`;
      button.addEventListener('click', () => { dialog.close(); commit({ from: moves[0].from, to: moves[0].to, promotion: type }); });
      options.append(button);
    }
    dialog.showModal();
  }

  function clickSquare(square: number) {
    if (match.status === 'finished') return;
    if (selected !== null) {
      const target = legalMoves(match.state, selected).filter((move) => move.to === square);
      if (target.length) { if (target[0].promotion) choosePromotion(target); else commit({ from: selected, to: square }); return; }
    }
    const piece = match.state.board[square];
    selected = piece?.side === match.state.sideToMove ? square : null;
    notice = ''; render();
  }

  root.querySelector('[data-action="restart"]')!.addEventListener('click', () => { gameNumber += 1; match = createMatch({ gameId: `local-${gameNumber}` }); selected = null; notice = ''; render(); });
  root.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((button) => button.addEventListener('click', () => {
    const transition = claimDraw(match, { claimant: match.state.sideToMove, basis: button.dataset.claim as 'threefold' | 'fifty_move' });
    if (transition.ok) match = transition.match;
    notice = transition.ok && transition.claimEvent.outcome === 'accepted' ? '' : 'That draw claim is not available in this position.'; render();
  }));
  render();
  return { getMatch: () => match, destroy: () => { root.replaceChildren(); } };
}
