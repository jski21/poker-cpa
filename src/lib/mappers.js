// Translate between the app's camelCase session model and the snake_case
// Postgres columns used by Supabase.

export function rowToSession(r) {
  return {
    id: r.id,
    date: r.date,
    location: r.location || '',
    gameType: r.game_type || 'NLH',
    format: r.format || 'Cash',
    stakes: r.stakes || '',
    bigBlind: Number(r.big_blind) || 0,
    buyIn: Number(r.buy_in) || 0,
    cashOut: Number(r.cash_out) || 0,
    hoursPlayed: Number(r.hours_played) || 0,
    handsPlayed: Number(r.hands_played) || 0,
    notes: r.notes || '',
    tags: r.tags || [],
  };
}

export function sessionToRow(s, userId) {
  return {
    id: s.id,
    user_id: userId,
    date: s.date,
    location: s.location || '',
    game_type: s.gameType || 'NLH',
    format: s.format || 'Cash',
    stakes: s.stakes || '',
    big_blind: Number(s.bigBlind) || 0,
    buy_in: Number(s.buyIn) || 0,
    cash_out: Number(s.cashOut) || 0,
    hours_played: Number(s.hoursPlayed) || 0,
    hands_played: parseInt(s.handsPlayed, 10) || 0,
    notes: s.notes || '',
    tags: s.tags || [],
  };
}
