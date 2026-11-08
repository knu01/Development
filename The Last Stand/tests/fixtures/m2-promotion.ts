// Standard Position 4 promotes pawns on both sides and captures a rook with promotion.
// FEN and counts are published in the Chess Programming Wiki Perft Results.
// https://www.chessprogramming.org/Perft_Results
export const PROMOTION_POSITION_4_FEN =
  'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
export const PROMOTION_POSITION_4_PERFT = [6, 264, 9467] as const;
