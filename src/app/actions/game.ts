'use server';

import db from '@/lib/db';

interface GameScore {
  id: number;
  player_name: string;
  score: number;
  max_combo: number;
  created_at: string;
}

export async function submitGameScore(score: number, maxCombo: number): Promise<{ rank: number }> {
  const { getCurrentAccount } = await import('@/lib/auth');
  const account = await getCurrentAccount();
  const playerName = account?.display_name ?? account?.username ?? '匿名玩家';

  db.prepare(`
    INSERT INTO game_scores (player_name, score, max_combo)
    VALUES (?, ?, ?)
  `).run(playerName, score, maxCombo);

  const rank = db.prepare(
    'SELECT COUNT(*) + 1 as rank FROM game_scores WHERE score > ?'
  ).get(score) as { rank: number };

  return { rank: rank.rank };
}

export async function getGameLeaderboard(limit = 10): Promise<GameScore[]> {
  return db.prepare(`
    SELECT id, player_name, score, max_combo, created_at
    FROM game_scores
    ORDER BY score DESC, created_at ASC
    LIMIT ?
  `).all(limit) as GameScore[];
}
