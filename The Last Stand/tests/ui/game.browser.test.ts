import { describe, expect, it } from 'vitest';
import { mountGame } from '../../src/ui/game';

describe('playable game UI', () => {
  it('renders 64 squares and commits a legal click-to-move through Match', () => {
    document.body.innerHTML = '<main id="test-root"></main>';
    const root = document.querySelector<HTMLElement>('#test-root')!;
    const game = mountGame(root);
    expect(root.querySelectorAll('[data-square]')).toHaveLength(64);
    expect(root.querySelector('[data-square="52"]')?.textContent).toContain('♙');
    root.querySelector<HTMLElement>('[data-square="52"]')!.click();
    expect(root.querySelectorAll('.legal-target')).toHaveLength(2);
    root.querySelector<HTMLElement>('[data-square="36"]')!.click();
    expect(game.getMatch().ply).toBe(1);
    expect(game.getMatch().state.board[36]).toEqual({ side: 'white', type: 'pawn' });
    expect(root.querySelector('[data-ply="1"]')).not.toBeNull();
    game.destroy();
  });
});
