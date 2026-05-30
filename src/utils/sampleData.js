// 15 realistic sample sessions so a first-time user sees a populated dashboard.

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Build dates counting back from a reference day so the curve looks recent.
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

const RAW = [
  { d: 88, loc: 'Bellagio', game: 'NLH', fmt: 'Cash', stk: '2/5', bb: 5, buy: 500, cash: 940, hrs: 6, hands: 165, tags: ['live', 'focused'], notes: 'Ran a big set over set in their favor early, recovered with patience.' },
  { d: 81, loc: 'Online', game: 'NLH', fmt: 'Cash', stk: '1/2', bb: 2, buy: 200, cash: 118, hrs: 3, hands: 240, tags: ['online', 'tired'], notes: 'Too many tables, sloppy. Should have quit at hour 2.' },
  { d: 74, loc: 'Aria', game: 'NLH', fmt: 'Cash', stk: '5/10', bb: 10, buy: 1000, cash: 1640, hrs: 7.5, hands: 210, tags: ['live', 'game select'], notes: 'Soft tourist table, value bet thin all night.' },
  { d: 67, loc: 'Bellagio', game: 'PLO', fmt: 'Cash', stk: '2/5', bb: 5, buy: 500, cash: 215, hrs: 4, hands: 120, tags: ['live', 'ran bad'], notes: 'Stacked twice on the river, nothing I could do.' },
  { d: 60, loc: 'Online', game: 'NLH', fmt: 'Tournament', stk: '109', bb: 0, buy: 109, cash: 0, hrs: 3.5, hands: 0, tags: ['online'], notes: 'Bubbled the Sunday Storm. AK < QQ flip for top 10 stack.' },
  { d: 53, loc: 'Wynn', game: 'NLH', fmt: 'Cash', stk: '2/5', bb: 5, buy: 500, cash: 780, hrs: 5.5, hands: 150, tags: ['live', 'focused'], notes: 'Disciplined, folded a lot, picked spots.' },
  { d: 46, loc: 'Online', game: 'NLH', fmt: 'Cash', stk: '1/2', bb: 2, buy: 200, cash: 305, hrs: 2.5, hands: 195, tags: ['online', 'ran good'], notes: 'Hot run of cards, flopped two sets.' },
  { d: 39, loc: 'Aria', game: 'NLH', fmt: 'Cash', stk: '5/10', bb: 10, buy: 1500, cash: 760, hrs: 8, hands: 230, tags: ['live', 'tilted'], notes: 'Tilted after a cooler, kept reloading. Bad night mentally.' },
  { d: 32, loc: 'Bellagio', game: 'NLH', fmt: 'Cash', stk: '2/5', bb: 5, buy: 500, cash: 612, hrs: 4.5, hands: 130, tags: ['live'], notes: 'Steady grind, small win.' },
  { d: 26, loc: 'Online', game: 'NLH', fmt: 'Sit & Go', stk: '50', bb: 0, buy: 50, cash: 175, hrs: 1.5, hands: 0, tags: ['online', 'ran good'], notes: 'Won a hyper SNG, clean.' },
  { d: 21, loc: 'Wynn', game: 'PLO', fmt: 'Cash', stk: '5/10', bb: 10, buy: 1000, cash: 1380, hrs: 6, hands: 175, tags: ['live', 'game select'], notes: 'Found a juicy PLO game, position is everything.' },
  { d: 15, loc: 'Online', game: 'NLH', fmt: 'Cash', stk: '1/2', bb: 2, buy: 200, cash: 142, hrs: 3, hands: 260, tags: ['online'], notes: 'Grindy session, card dead.' },
  { d: 10, loc: 'Aria', game: 'NLH', fmt: 'Cash', stk: '2/5', bb: 5, buy: 600, cash: 1180, hrs: 7, hands: 200, tags: ['live', 'focused', 'ran good'], notes: 'Best live session in a while, everything went right.' },
  { d: 5, loc: 'Bellagio', game: 'NLH', fmt: 'Cash', stk: '2/5', bb: 5, buy: 500, cash: 360, hrs: 4, hands: 140, tags: ['live', 'tired'], notes: 'Played past my best, should have racked up.' },
  { d: 2, loc: 'Online', game: 'NLH', fmt: 'Cash', stk: '1/2', bb: 2, buy: 200, cash: 268, hrs: 2, hands: 170, tags: ['online', 'focused'], notes: 'Short focused session, good stop.' },
];

export function makeSampleSessions() {
  return RAW.map((r) => ({
    id: uid(),
    date: daysAgo(r.d),
    location: r.loc,
    gameType: r.game,
    format: r.fmt,
    stakes: r.stk,
    bigBlind: r.bb,
    buyIn: r.buy,
    cashOut: r.cash,
    hoursPlayed: r.hrs,
    handsPlayed: r.hands,
    notes: r.notes,
    tags: r.tags,
  }));
}
