export const BURN_CARDS = [
  "side_eye",
  "flat_joke",
  "bad_haircut",
  "cheap_cologne",
  "slow_walker",
  "group_chat_ghost",
  "bad_karaoke",
  "always_late",
  "fake_laugh",
  "questionable_fashion",
];

// Defensive cards, held in hand and consumed reactively when targeted.
export const SHIELD_CARDS = [
  "no_u",
  "deflect",
  "thick_skin",
  "comeback_loaded",
];

// Higher damage, but only playable if the actor supplies a real specific
// detail about the target — self-balancing because generic play feels weak.
export const COMBO_CARDS = [
  "receipts",
  "callback_burn",
  "impression",
  "roast_freestyle",
];

// Restricted-target cards — can only be aimed at specific seats/states.
export const TARGETED_CARDS = [
  "dogpile", // only playable on current leader (lowest damage taken)
  "payback", // only playable on whoever last targeted the actor
  "neighbor_burn", // only playable on the seat to the actor's left
];

// Special-effect wild cards.
export const WILD_CARDS = [
  "reflect",
  "double_down",
  "steal_shield",
  "group_roast",
  "immunity",
];

export interface CardMeta {
  name: string;
  emoji: string;
  damage: number; // base damage; 0 for non-damage utility cards
  description: string;
}

export const CARD_NAMES: Record<string, CardMeta> = {
  burn_side_eye: {
    name: "The Side Eye",
    emoji: "👀",
    damage: 1,
    description: "A withering look says it all.",
  },
  burn_flat_joke: {
    name: "Flat Joke Callout",
    emoji: "🦗",
    damage: 1,
    description: '"...anyway."',
  },
  burn_bad_haircut: {
    name: "Bad Haircut",
    emoji: "💇",
    damage: 2,
    description: "Who did this to you.",
  },
  burn_cheap_cologne: {
    name: "Cheap Cologne Cloud",
    emoji: "🧴",
    damage: 2,
    description: "Aisle 5 called.",
  },
  burn_slow_walker: {
    name: "Slow Walker",
    emoji: "🐌",
    damage: 2,
    description: "We have places to be.",
  },
  burn_group_chat_ghost: {
    name: "Group Chat Ghost",
    emoji: "👻",
    damage: 2,
    description: "Left on read since March.",
  },
  burn_bad_karaoke: {
    name: "Bad Karaoke Take",
    emoji: "🎤",
    damage: 3,
    description: "Pitchy, dawg.",
  },
  burn_always_late: {
    name: "Chronically Late",
    emoji: "⏰",
    damage: 3,
    description: '"Traffic" — sure.',
  },
  burn_fake_laugh: {
    name: "Fake Laugh Detector",
    emoji: "😬",
    damage: 3,
    description: "That wasn't funny and we all know it.",
  },
  burn_questionable_fashion: {
    name: "Questionable Fashion Choice",
    emoji: "🧦",
    damage: 3,
    description: "Socks with sandals energy.",
  },

  shield_no_u: {
    name: "No U",
    emoji: "🔁",
    damage: 0,
    description: "Block one incoming burn entirely.",
  },
  shield_deflect: {
    name: "Deflect",
    emoji: "🛡️",
    damage: 0,
    description: "Halve incoming damage (round up).",
  },
  shield_thick_skin: {
    name: "Thick Skin",
    emoji: "🐘",
    damage: 0,
    description: "Reduce incoming damage by 2.",
  },
  shield_comeback_loaded: {
    name: "Comeback Loaded",
    emoji: "💥",
    damage: 0,
    description: "Block and return 1 damage to attacker.",
  },

  combo_receipts: {
    name: "Pull the Receipts",
    emoji: "🧾",
    damage: 4,
    description: "Requires a real, specific example.",
  },
  combo_callback_burn: {
    name: "Callback Burn",
    emoji: "🔂",
    damage: 4,
    description: "Reference something said earlier this game.",
  },
  combo_impression: {
    name: "Do an Impression",
    emoji: "🎭",
    damage: 4,
    description: "Impersonate the target for 5 seconds first.",
  },
  combo_roast_freestyle: {
    name: "Freestyle Roast",
    emoji: "🎙️",
    damage: 5,
    description: "Improvised, no card text — group votes if it lands.",
  },

  target_dogpile: {
    name: "Dogpile",
    emoji: "🐕",
    damage: 3,
    description: "Only playable on the current leader.",
  },
  target_payback: {
    name: "Payback",
    emoji: "🎯",
    damage: 3,
    description: "Only playable on whoever last hit you.",
  },
  target_neighbor_burn: {
    name: "Neighbor Burn",
    emoji: "↩️",
    damage: 2,
    description: "Only playable on the seat to your left.",
  },

  wild_reflect: {
    name: "Reflect",
    emoji: "🪞",
    damage: 0,
    description: "Redirect the next card played on you back at its owner.",
  },
  wild_double_down: {
    name: "Double Down",
    emoji: "✖️2",
    damage: 0,
    description: "Double the damage of your next burn card.",
  },
  wild_steal_shield: {
    name: "Steal Shield",
    emoji: "🧲",
    damage: 0,
    description: "Take a shield card from any player's hand.",
  },
  wild_group_roast: {
    name: "Group Roast",
    emoji: "🎪",
    damage: 2,
    description: "Deal damage to every other player.",
  },
  wild_immunity: {
    name: "Immunity",
    emoji: "✨",
    damage: 0,
    description: "Take no damage until your next turn.",
  },
};

// Cards playable with no target selection: shields equip on the actor,
// these three wilds are self-buffs, and group_roast auto-hits everyone.
// Keep this in sync with the play-card branches in convex/game.ts.
const NO_TARGET_CARDS = new Set<string>([
  ...SHIELD_CARDS.map((id) => `shield_${id}`),
  "wild_reflect",
  "wild_double_down",
  "wild_immunity",
  "wild_group_roast",
]);

/**
 * Whether a card needs a target selected before it can be played. Used by
 * RoastCard.tsx (tooltip hint) and Gameboard.tsx (whether to open the
 * target picker vs. play immediately).
 */
export function requiresTarget(cardId: string): boolean {
  return !NO_TARGET_CARDS.has(cardId);
}

// ─── Balance Constants ─────────────────────────────────────────────────────

export const STARTING_HEALTH = 20;
export const STARTING_HAND_SIZE = 7;
export const MAX_HAND_SIZE = 10;

// ─── Pure Helpers ──────────────────────────────────────────────────────────

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createRoastDeck(): string[] {
  const deck: string[] = [];
  for (const id of BURN_CARDS)
    for (let i = 0; i < 4; i++) deck.push(`burn_${id}`);
  for (const id of SHIELD_CARDS)
    for (let i = 0; i < 3; i++) deck.push(`shield_${id}`);
  for (const id of COMBO_CARDS)
    for (let i = 0; i < 2; i++) deck.push(`combo_${id}`);
  for (const id of TARGETED_CARDS)
    for (let i = 0; i < 2; i++) deck.push(`target_${id}`);
  for (const id of WILD_CARDS) deck.push(`wild_${id}`);
  return shuffle(deck);
}

export function parseRoastCard(cardId: string): {
  category: string;
  name: string;
} {
  const idx = cardId.indexOf("_");
  if (idx === -1) return { category: "wild", name: cardId };
  return { category: cardId.slice(0, idx), name: cardId.slice(idx + 1) };
}

export interface PlayContext {
  actorId: string;
  targetId: string;
  leaderId: string | null; // player currently with the most health
  lastAttackerOfTarget: string | null; // who last hit the intended target
  neighborLeftId: string | null; // seat to actor's left
  targetImmune: boolean;
  targetShieldCards: string[]; // shield cards currently in target's hand
}

/**
 * Whether a card can currently be played against the given target. Pure and
 * synchronous so the UI can call it directly for instant feedback (disabling
 * cards, greying out invalid targets) without waiting on a server
 * round-trip. convex/game.ts calls this same function server-side to
 * authoritatively enforce the rule — never trust the client-side check alone.
 */
export function canPlayRoastCard(cardId: string, ctx: PlayContext): boolean {
  const { category, name } = parseRoastCard(cardId);

  if (ctx.targetImmune && category !== "shield") return false;

  if (category === "target") {
    if (name === "dogpile" && ctx.targetId !== ctx.leaderId) return false;
    if (name === "payback" && ctx.targetId !== ctx.lastAttackerOfTarget)
      return false;
    if (name === "neighbor_burn" && ctx.targetId !== ctx.neighborLeftId)
      return false;
  }

  return true;
}

export interface DamageResult {
  finalDamage: number;
  blocked: boolean;
  reflectedTo: string | null; // target id the damage bounces to, if any
  shieldCardConsumed: string | null; // shield card id to remove from target's hand
}

/**
 * Resolves the actual damage dealt once shields/reflects are accounted for.
 * Pure function — the caller (convex/game.ts) is responsible for actually
 * mutating player health and hands based on the result.
 */
export function resolveDamage(
  cardId: string,
  baseDamage: number,
  targetShieldCards: string[],
  targetHasReflect: boolean,
  doubleDownActive: boolean,
): DamageResult {
  let damage = doubleDownActive ? baseDamage * 2 : baseDamage;

  if (targetHasReflect) {
    return {
      finalDamage: 0,
      blocked: true,
      reflectedTo: "ACTOR",
      shieldCardConsumed: null,
    };
  }

  if (targetShieldCards.includes("shield_no_u")) {
    return {
      finalDamage: 0,
      blocked: true,
      reflectedTo: null,
      shieldCardConsumed: "shield_no_u",
    };
  }
  if (targetShieldCards.includes("shield_comeback_loaded")) {
    return {
      finalDamage: 0,
      blocked: true,
      reflectedTo: "ACTOR_MINUS_1",
      shieldCardConsumed: "shield_comeback_loaded",
    };
  }
  if (targetShieldCards.includes("shield_deflect")) {
    damage = Math.ceil(damage / 2);
    return {
      finalDamage: damage,
      blocked: false,
      reflectedTo: null,
      shieldCardConsumed: "shield_deflect",
    };
  }
  if (targetShieldCards.includes("shield_thick_skin")) {
    damage = Math.max(0, damage - 2);
    return {
      finalDamage: damage,
      blocked: false,
      reflectedTo: null,
      shieldCardConsumed: "shield_thick_skin",
    };
  }

  return {
    finalDamage: damage,
    blocked: false,
    reflectedTo: null,
    shieldCardConsumed: null,
  };
}

/** True once a player's health has hit zero. */
export function isEliminated(health: number): boolean {
  return health <= 0;
}

/** Returns the winning player id once only one non-eliminated player remains, else null. */
export function checkWinner(
  playerHealths: Record<string, number>,
): string | null {
  const alive = Object.entries(playerHealths).filter(([, hp]) => hp > 0);
  if (alive.length === 1) return alive[0][0];
  return null;
}

/** Appends to actionLog, keeps last 10 entries. */
export function appendActionLog(
  existing: string[] | undefined,
  newEntry: string,
): string[] {
  const log = existing ?? [];
  return [...log, newEntry].slice(-10);
}
