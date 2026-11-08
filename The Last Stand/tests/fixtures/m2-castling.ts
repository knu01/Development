// Kiwipete perft fixture, as published in the Chess Programming Wiki Perft Results.
// https://www.chessprogramming.org/Perft_Results
export const KIWIPETE_CASTLING_FEN =
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
export const KIWIPETE_CASTLING_PERFT_DEPTH_1 = 48;

export const CASTLING_POSITIONS = {
  white: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
  black: 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',
} as const;
