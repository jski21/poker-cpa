// Static option lists and presets used across the app.

export const STORAGE_KEY = 'poker-cpa-state-v1';

export const GAME_TYPES = ['NLH', 'PLO', 'Omaha Hi/Lo', 'Stud', 'Other'];

// The Log form uses a compact segmented control; full list still available in filters.
export const GAME_TYPES_SEGMENTED = ['NLH', 'PLO', 'Other'];

export const FORMATS = ['Cash', 'Tournament', 'Sit & Go'];

export const TAG_OPTIONS = [
  'tired',
  'tilted',
  'focused',
  'ran good',
  'ran bad',
  'game select',
  'online',
  'live',
];

export const CURRENCIES = ['$', '€', '£'];

// Known cash stakes -> big blind in dollars, used for big-blind auto-fill.
// Microstakes (online) are labeled by their 100bb buy-in: NL2, NL5, NL10, etc.
export const STAKES_PRESETS = {
  // Microstakes (online)
  '0.01/0.02': 0.02, // NL2
  '0.02/0.05': 0.05, // NL5
  '0.05/0.1': 0.1, // NL10
  '0.05/0.10': 0.1, // NL10 (alt spelling)
  '0.08/0.16': 0.16, // NL16
  '0.1/0.2': 0.2, // NL20
  '0.1/0.25': 0.25, // NL25
  '0.10/0.25': 0.25, // NL25 (alt spelling)
  '0.25/0.5': 0.5, // NL50
  '0.25/0.50': 0.5, // NL50 (alt spelling)
  // Low / mid stakes
  '0.5/1': 1,
  '1/1': 1,
  '1/2': 2,
  '1/3': 3,
  '2/3': 3,
  '2/5': 5,
  '5/5': 5,
  '5/10': 10,
  '10/20': 20,
  '10/25': 25,
  '25/50': 50,
  '50/100': 100,
};

export const STAKES_QUICK_PICKS = [
  '0.01/0.02',
  '0.02/0.05',
  '0.05/0.10',
  '0.10/0.25',
  '0.25/0.50',
  '1/2',
  '2/5',
  '5/10',
];

export const DEFAULT_SETTINGS = {
  currency: '$',
  stdDevOverride: null,
  handsPerHour: 25,
  targetRoR: 5,
};

export const DEFAULT_BANKROLL = {
  current: 0,
  deposits: [],
  withdrawals: [],
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TABS = [
  { id: 'log', label: 'Log', icon: '📋', full: 'Log Session' },
  { id: 'dashboard', label: 'Stats', icon: '📊', full: 'Dashboard' },
  { id: 'charts', label: 'Charts', icon: '📈', full: 'Charts' },
  { id: 'calculators', label: 'Calc', icon: '🧮', full: 'Calculators' },
  { id: 'history', label: 'History', icon: '📝', full: 'Session History' },
];
