"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Play,
  Eye,
  EyeOff,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSoundManager } from "@/hooks/useSoundManager";

import {
  CARD_NAMES,
  STARTING_HEALTH,
  STARTING_HAND_SIZE,
  MAX_HAND_SIZE,
  createRoastDeck,
  parseRoastCard,
  canPlayRoastCard,
  requiresTarget,
  resolveDamage,
  isEliminated,
  checkWinner,
  appendActionLog,
  shuffle,
  type PlayContext,
  type DamageResult,
} from "@/lib/roastRules";
import { CardBack, RoastCard } from "../components/RoastCard";

// ─── Types ──────────────────────────────────────────────────────────────────
type GameStatus = "setup" | "handoff" | "playing" | "finished";

interface LocalPlayer {
  id: string;
  name: string;
  hand: string[];
  health: number;
  isEliminated: boolean;
  shieldCards: string[]; // also doubles as "active effects" (reflect/double_down/immunity)
}

interface LocalGameState {
  players: LocalPlayer[];
  playerOrder: string[]; // fixed seat order — used for neighbor_burn targeting
  deck: string[];
  discardPile: string[];
  currentPlayerIndex: number;
  lastTarget: string | null;
  lastAction: string;
  actionLog: string[];
  status: "active" | "finished";
  winnerId: string | null;
}

const SHIELD_ICONS: Record<string, string> = {
  shield_no_u: "🔁",
  shield_deflect: "🛡️",
  shield_thick_skin: "🐘",
  shield_comeback_loaded: "💥",
  wild_reflect: "🪞",
  wild_double_down: "✖️2",
  wild_immunity: "✨",
};

// ─── Pure game logic (mirrors convex/game.ts, run locally/synchronously) ────
function initGame(names: string[]): LocalGameState {
  const deck = createRoastDeck();
  const players: LocalPlayer[] = names.map((name, i) => ({
    id: `p${i}`,
    name,
    hand: deck.splice(0, STARTING_HAND_SIZE),
    health: STARTING_HEALTH,
    isEliminated: false,
    shieldCards: [],
  }));
  const opening = "🎤 The roast battle begins. No mercy.";
  return {
    players,
    playerOrder: players.map((p) => p.id),
    deck,
    discardPile: [],
    currentPlayerIndex: 0,
    lastTarget: null,
    lastAction: opening,
    actionLog: [opening],
    status: "active",
    winnerId: null,
  };
}

function computeLeaderId(players: LocalPlayer[]): string | null {
  const alive = players.filter((p) => !p.isEliminated);
  if (alive.length === 0) return null;
  return alive.reduce((best, p) => (p.health > best.health ? p : best)).id;
}

function computeLeftNeighbor(playerOrder: string[], id: string): string | null {
  const idx = playerOrder.indexOf(id);
  if (idx === -1) return null;
  return playerOrder[(idx + 1) % playerOrder.length];
}

// Local mode has no bot to auto-skip a knocked-out player's turn, so unlike
// the server (which just does +1 % length), we skip eliminated seats here —
// otherwise a 3-4 player local game could stall on a dead player's turn.
function nextAliveIndex(players: LocalPlayer[], fromIndex: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx].isEliminated) return idx;
  }
  return fromIndex;
}

function applyDamageResultLocal(
  actor: LocalPlayer,
  target: LocalPlayer,
  result: DamageResult,
) {
  if (result.shieldCardConsumed) {
    target.shieldCards = target.shieldCards.filter(
      (c) => c !== result.shieldCardConsumed,
    );
  }
  if (result.reflectedTo === "ACTOR") {
    target.shieldCards = target.shieldCards.filter((c) => c !== "wild_reflect");
    return;
  }
  if (result.reflectedTo === "ACTOR_MINUS_1") {
    actor.health = Math.max(0, actor.health - 1);
    actor.isEliminated = isEliminated(actor.health);
    return;
  }
  if (result.finalDamage > 0) {
    target.health = Math.max(0, target.health - result.finalDamage);
    target.isEliminated = isEliminated(target.health);
  }
}

function buildPlayContext(
  state: LocalGameState,
  actorId: string,
  target: LocalPlayer,
): PlayContext {
  return {
    actorId,
    targetId: target.id,
    leaderId: computeLeaderId(state.players),
    lastAttackerOfTarget: state.lastTarget === target.id ? actorId : null,
    neighborLeftId: computeLeftNeighbor(state.playerOrder, actorId),
    targetImmune: target.shieldCards.includes("wild_immunity"),
    targetShieldCards: target.shieldCards,
  };
}

function getValidTargets(
  state: LocalGameState,
  actorId: string,
  cardId: string,
): LocalPlayer[] {
  const candidates = state.players.filter(
    (p) => p.id !== actorId && !p.isEliminated,
  );
  if (cardId === "wild_steal_shield") {
    return candidates.filter((p) => p.shieldCards.length > 0);
  }
  return candidates.filter((p) =>
    canPlayRoastCard(cardId, buildPlayContext(state, actorId, p)),
  );
}

function applyPlayCard(
  state: LocalGameState,
  actorId: string,
  cardId: string,
  targetId?: string,
): LocalGameState {
  const players = state.players.map((p) => ({
    ...p,
    hand: [...p.hand],
    shieldCards: [...p.shieldCards],
  }));
  const actor = players.find((p) => p.id === actorId)!;
  const cardIdx = actor.hand.indexOf(cardId);
  if (cardIdx === -1) return state;
  actor.hand.splice(cardIdx, 1);

  const { category } = parseRoastCard(cardId);
  let discardPile = [...state.discardPile, cardId];
  let lastAction = `${actor.name} played ${CARD_NAMES[cardId]?.name ?? cardId}`;

  if (category === "shield") {
    discardPile = state.discardPile; // equipped, not discarded
    actor.shieldCards.push(cardId);
    lastAction = `${actor.name} readies ${CARD_NAMES[cardId]?.name ?? cardId} 🛡️`;
  } else if (
    cardId === "wild_reflect" ||
    cardId === "wild_double_down" ||
    cardId === "wild_immunity"
  ) {
    discardPile = state.discardPile;
    actor.shieldCards.push(cardId);
    lastAction = `${actor.name} activates ${CARD_NAMES[cardId]?.name ?? cardId} ✨`;
  } else if (cardId === "wild_steal_shield") {
    const target = players.find((p) => p.id === targetId);
    if (!target || target.shieldCards.length === 0) return state;
    const stolen = target.shieldCards.shift()!;
    actor.shieldCards.push(stolen);
    lastAction = `${actor.name} steals ${CARD_NAMES[stolen]?.name ?? stolen} from ${target.name} 🧲`;
  } else if (cardId === "wild_group_roast") {
    const baseDamage = CARD_NAMES[cardId]?.damage ?? 2;
    const hitNames: string[] = [];
    for (const target of players.filter(
      (p) => p.id !== actorId && !p.isEliminated,
    )) {
      const result = resolveDamage(
        cardId,
        baseDamage,
        target.shieldCards,
        target.shieldCards.includes("wild_reflect"),
        false,
      );
      applyDamageResultLocal(actor, target, result);
      hitNames.push(target.name);
    }
    lastAction = `${actor.name} roasts the whole table 🎪 (${hitNames.join(", ")})`;
  } else {
    const target = players.find((p) => p.id === targetId);
    if (!target) return state;
    const ctx = buildPlayContext(state, actorId, target);
    if (!canPlayRoastCard(cardId, ctx)) return state;
    const doubleDownActive = actor.shieldCards.includes("wild_double_down");
    const baseDamage = CARD_NAMES[cardId]?.damage ?? 0;
    const result = resolveDamage(
      cardId,
      baseDamage,
      target.shieldCards,
      target.shieldCards.includes("wild_reflect"),
      doubleDownActive,
    );
    if (doubleDownActive) {
      actor.shieldCards = actor.shieldCards.filter(
        (c) => c !== "wild_double_down",
      );
    }
    applyDamageResultLocal(actor, target, result);
    lastAction =
      result.finalDamage > 0
        ? `${actor.name} hits ${target.name} with ${CARD_NAMES[cardId]?.name ?? cardId} for ${result.finalDamage} 💥`
        : `${target.name} blocks ${actor.name}'s ${CARD_NAMES[cardId]?.name ?? cardId} 🛡️`;
  }

  const healths: Record<string, number> = {};
  for (const p of players) healths[p.id] = p.isEliminated ? 0 : p.health;
  const winnerId = checkWinner(healths);
  const nextIndex = winnerId
    ? state.currentPlayerIndex
    : nextAliveIndex(players, state.currentPlayerIndex);

  return {
    ...state,
    players,
    discardPile,
    lastTarget: targetId ?? null,
    currentPlayerIndex: nextIndex,
    lastAction,
    actionLog: appendActionLog(state.actionLog, lastAction),
    status: winnerId ? "finished" : "active",
    winnerId,
  };
}

function applyDrawCard(state: LocalGameState, actorId: string): LocalGameState {
  const players = state.players.map((p) => ({ ...p, hand: [...p.hand] }));
  const actor = players.find((p) => p.id === actorId)!;
  if (actor.hand.length >= MAX_HAND_SIZE) {
    const lastAction = `${actor.name}'s hand is full — turn passes`;
    return {
      ...state,
      players,
      currentPlayerIndex: nextAliveIndex(players, state.currentPlayerIndex),
      lastAction,
      actionLog: appendActionLog(state.actionLog, lastAction),
    };
  }
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  if (deck.length === 0 && discardPile.length > 0) {
    deck = shuffle(discardPile);
    discardPile = [];
  }
  const drawn = deck.shift();
  if (drawn) actor.hand.push(drawn);
  const lastAction = `${actor.name} draws a card 🃏`;
  return {
    ...state,
    players,
    deck,
    discardPile,
    currentPlayerIndex: nextAliveIndex(players, state.currentPlayerIndex),
    lastAction,
    actionLog: appendActionLog(state.actionLog, lastAction),
  };
}

// ─── Health bar ─────────────────────────────────────────────────────────────
function HealthBar({ health, name }: { health: number; name: string }) {
  const pct = Math.max(0, Math.min(100, (health / STARTING_HEALTH) * 100));
  const critical = health <= STARTING_HEALTH * 0.25;
  const warning = health <= STARTING_HEALTH * 0.5;
  return (
    <div className="flex flex-col gap-0.5 w-full min-w-0">
      <div className="flex justify-between text-[9px] text-white/50">
        <span className="truncate max-w-[80px]">{name}</span>
        <span
          className={`font-bold ml-1 ${critical ? "text-red-400" : warning ? "text-yellow-400" : "text-green-400"}`}
        >
          {Math.max(0, health)}/{STARTING_HEALTH} HP {critical && "💀"}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className={`h-1.5 rounded-full ${
            critical
              ? "bg-gradient-to-r from-red-600 to-red-400"
              : warning
                ? "bg-gradient-to-r from-yellow-500 to-yellow-300"
                : "bg-gradient-to-r from-green-500 to-green-300"
          }`}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80 }}
        />
      </div>
    </div>
  );
}

function ShieldTray({ shieldCards }: { shieldCards: string[] }) {
  if (shieldCards.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {shieldCards.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="text-xs bg-white/10 rounded-full px-1.5 py-0.5"
          title={CARD_NAMES[c]?.name ?? c}
        >
          {SHIELD_ICONS[c] ?? "✨"}
        </span>
      ))}
    </div>
  );
}

// ─── Target picker ──────────────────────────────────────────────────────────
function TargetModal({
  players,
  cardId,
  onSelect,
  onCancel,
}: {
  players: LocalPlayer[];
  cardId: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-sm w-full"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <h3 className="text-white font-black text-lg mb-1">
          🎯 Choose Your Target
        </h3>
        <p className="text-white/40 text-xs mb-4">
          Who&apos;s catching {CARD_NAMES[cardId]?.name ?? "this"}?
        </p>
        {players.length === 0 ? (
          <p className="text-white/50 text-sm text-center py-4">
            No valid targets for this card right now.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <motion.button
                key={player.id}
                onClick={() => onSelect(player.id)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-left"
                whileHover={{ x: 4 }}
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-xl flex-shrink-0">
                  🔥
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {player.name}
                  </div>
                  <div className="text-[10px] text-white/50">
                    ❤️ {player.health}/{STARTING_HEALTH}
                    {player.shieldCards.length > 0 &&
                      ` · 🛡️ ${player.shieldCards.length}`}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
        <button
          onClick={onCancel}
          className="mt-3 w-full text-white/40 text-sm hover:text-white/60"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── SETUP SCREEN ───────────────────────────────────────────────────────────
function SetupScreen({ onStart }: { onStart: (names: string[]) => void }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState([
    "Player 1",
    "Player 2",
    "Player 3",
    "Player 4",
  ]);
  const updateName = (i: number, val: string) => {
    const n = [...names];
    n[i] = val;
    setNames(n);
  };
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-white dark:bg-red-950 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="text-6xl mb-3">🔥🎤🔥</div>
        <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white tracking-tight">
          Play Locally
        </h1>
        <p className="mt-2 text-gray-500 dark:text-red-300">
          Pass the device between players — up to 4 roasters, one screen
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="w-full max-w-md p-6 rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-red-950/40 shadow-xl relative z-10"
      >
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-red-200 mb-3">
            <Users className="inline h-4 w-4 mr-1" /> Number of Players
          </label>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                  playerCount === n
                    ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                    : "bg-gray-100 dark:bg-red-900/30 text-gray-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-red-200 mb-2">
            Player Names
          </label>
          {Array.from({ length: playerCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={names[i]}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none bg-gray-50 dark:bg-red-900/30 border border-gray-200 dark:border-red-700 text-black dark:text-white placeholder:text-gray-400"
                />
              </div>
            </motion.div>
          ))}
        </div>
        <Button
          className="w-full py-6 text-lg bg-red-600 hover:bg-red-500 text-white shadow-lg"
          onClick={() => onStart(names.slice(0, playerCount))}
        >
          <Play className="h-5 w-5 mr-2" /> Start Roasting
        </Button>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-sm text-gray-400 dark:text-red-500 max-w-sm relative z-10"
      >
        Each player sees their own hand privately. Everyone starts at{" "}
        {STARTING_HEALTH} HP — last one standing wins.
      </motion.p>
    </main>
  );
}

// ─── HANDOFF SCREEN ─────────────────────────────────────────────────────────
function HandoffScreen({
  player,
  onReveal,
}: {
  player: LocalPlayer;
  onReveal: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #3e0a0a 0%, #210d0d 50%, #120505 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full"
      >
        <div className="mb-8">
          <motion.div
            className="w-24 h-24 rounded-3xl bg-red-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-red-500/40"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <EyeOff className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-white mb-2">Hand Off!</h2>
          <p className="text-red-300">Pass the device to</p>
          <p className="text-3xl font-black text-white mt-1 px-4 break-words leading-tight">
            {player.name}
          </p>
          <p className="text-red-300 mt-2 text-sm">
            {player.health}/{STARTING_HEALTH} HP · {player.hand.length} cards
          </p>
        </div>
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: Math.min(player.hand.length, 7) }).map(
            (_, i) => (
              <div key={i} style={{ transform: `rotate(${(i - 3) * 5}deg)` }}>
                <CardBack size="sm" />
              </div>
            ),
          )}
          {player.hand.length > 7 && (
            <div className="w-10 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/60">
              +{player.hand.length - 7}
            </div>
          )}
        </div>
        <p className="text-red-400 text-sm mb-6">
          Make sure nobody else is looking before revealing your cards!
        </p>
        <Button
          className="w-full py-5 text-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30"
          onClick={onReveal}
        >
          <Eye className="h-5 w-5 mr-2" /> Reveal My Hand
        </Button>
      </motion.div>
    </div>
  );
}

// ─── GAME SCREEN ────────────────────────────────────────────────────────────
function GameScreen({
  gameState,
  currentPlayer,
  actionTaken,
  onPlayCard,
  onDrawCard,
}: {
  gameState: LocalGameState;
  currentPlayer: LocalPlayer;
  actionTaken: boolean;
  onPlayCard: (cardId: string, targetId?: string) => void;
  onDrawCard: () => void;
}) {
  const { play, setMuted } = useSoundManager();
  const [muted, setMutedState] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const others = gameState.players.filter((p) => p.id !== currentPlayer.id);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  function handlePlayCard(cardId: string, targetId?: string) {
    const { category } = parseRoastCard(cardId);
    if (category === "burn") play("cardSabotage");
    else if (category === "shield") play("cardExcuse");
    else if (category === "combo") play("cardTool");
    else play("cardWild");
    onPlayCard(cardId, targetId);
    setPendingCard(null);
    setShowTargetModal(false);
  }

  function handleCardClick(cardId: string) {
    if (actionTaken || currentPlayer.isEliminated) return;
    if (!requiresTarget(cardId)) {
      handlePlayCard(cardId);
      return;
    }
    const validTargets = getValidTargets(gameState, currentPlayer.id, cardId);
    if (cardId !== "wild_steal_shield" && validTargets.length === 0) {
      return; // no legal target right now — card stays greyed out by RoastCard
    }
    setPendingCard(cardId);
    setShowTargetModal(true);
  }

  function handleDraw() {
    if (actionTaken) return;
    play("cardDraw");
    onDrawCard();
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #4a1a1a 0%, #2d0f0f 45%, #1a0909 100%)",
      }}
    >
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm gap-2">
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 bg-black/30 text-xs font-semibold text-white/70">
          🃏 <span>{gameState.deck.length}</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-3">
          <span className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">
            Now Roasting
          </span>
          <span className="text-base font-black text-white truncate w-full text-center leading-snug">
            {currentPlayer.name}
          </span>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Other players' health + shields */}
        <div className="flex justify-center gap-3 pt-5 pb-2 px-4 flex-wrap">
          {others.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1.5 w-28">
              <HealthBar health={p.health} name={p.name} />
              <ShieldTray shieldCards={p.shieldCards} />
              {p.isEliminated && (
                <span className="text-[10px] text-red-400 font-bold">
                  ☠️ ROASTED OUT
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Center feed */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.lastAction}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-xs text-center px-4 py-2 rounded-xl max-w-xs border border-white/15 bg-black/30 backdrop-blur-sm text-white/70"
            >
              {gameState.lastAction}
            </motion.div>
          </AnimatePresence>
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold backdrop-blur-sm max-w-[260px] w-full justify-center"
            style={{
              background: "rgba(220,38,38,0.2)",
              borderColor: "#ef4444",
              color: "#fca5a5",
              boxShadow: "0 0 24px rgba(220,38,38,0.4)",
            }}
          >
            <Flame size={14} className="text-red-400 flex-shrink-0" />
            <span className="truncate">{currentPlayer.name}&apos;s turn!</span>
          </motion.div>
          <HealthBar health={currentPlayer.health} name="Your HP" />
          <ShieldTray shieldCards={currentPlayer.shieldCards} />
        </div>

        {/* Hand */}
        <div
          className="relative border-t border-white/10 bg-black/40 backdrop-blur-md px-4 pt-3 pb-4"
          style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center justify-between mb-3 gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 truncate min-w-0">
              {currentPlayer.name}&apos;s Hand ({currentPlayer.hand.length})
            </span>
          </div>
          {currentPlayer.isEliminated ? (
            <div className="text-center py-6 text-red-400 font-black text-lg">
              ☠️ You&apos;ve been ROASTED OUT! ☠️
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5 max-h-44 overflow-y-auto pb-1">
              {!actionTaken &&
                currentPlayer.hand.map((cardId, i) => (
                  <RoastCard
                    key={`${cardId}-${i}`}
                    cardId={cardId}
                    size="md"
                    isPlayable
                    isSelected={pendingCard === cardId}
                    onClick={() => handleCardClick(cardId)}
                    index={i}
                  />
                ))}
            </div>
          )}
          <div className="mt-3 flex justify-center min-h-[40px] items-center">
            <AnimatePresence mode="wait">
              {actionTaken ? (
                <motion.div
                  key="passing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/30 border border-red-500/40 text-red-200 text-sm font-semibold"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block"
                  >
                    ⏳
                  </motion.span>
                  Passing to next player…
                </motion.div>
              ) : currentPlayer.isEliminated ? null : (
                <button
                  onClick={handleDraw}
                  className="text-xs text-white/40 hover:text-white/70"
                >
                  Play a card above, or draw and end your turn
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTargetModal && pendingCard && (
          <TargetModal
            players={getValidTargets(gameState, currentPlayer.id, pendingCard)}
            cardId={pendingCard}
            onSelect={(targetId) => handlePlayCard(pendingCard, targetId)}
            onCancel={() => {
              setPendingCard(null);
              setShowTargetModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── WIN SCREEN ─────────────────────────────────────────────────────────────
function WinScreen({
  winner,
  onRestart,
}: {
  winner: LocalPlayer;
  onRestart: () => void;
}) {
  const { play } = useSoundManager();
  useEffect(() => {
    play("roastWin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-950 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <motion.div
          className="text-8xl mb-6"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          🏆
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 px-4 break-words">
          {winner.name} Wins!
        </h1>
        <p className="text-red-300 text-lg mb-8">
          Last one standing. Nobody else survived the roast. 🔥
        </p>
        <Button
          className="bg-red-600 hover:bg-red-500 text-white px-12 py-5 text-lg"
          onClick={onRestart}
        >
          <RotateCcw className="h-5 w-5 mr-2" /> Play Again
        </Button>
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function LocalPlayPage() {
  const [gameStatus, setGameStatus] = useState<GameStatus>("setup");
  const [gameState, setGameState] = useState<LocalGameState | null>(null);
  const [showHand, setShowHand] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { play } = useSoundManager();
  const gameStateRef = useRef<LocalGameState | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const scheduleHandoff = useCallback(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null;
      setActionTaken(false);
      setShowHand(false);
      setGameStatus("handoff");
    }, 1500);
  }, []);

  const handleStart = useCallback(
    (names: string[]) => {
      const state = initGame(names);
      play("gameStart");
      setTimeout(() => play("cardDeal"), 800);
      setActionTaken(false);
      setGameState(state);
      setShowHand(false);
      setGameStatus("handoff");
    },
    [play],
  );

  const handlePlayCard = useCallback(
    (cardId: string, targetId?: string) => {
      const g = gameStateRef.current;
      if (!g) return;
      setActionTaken(true);
      const next = applyPlayCard(
        g,
        g.players[g.currentPlayerIndex].id,
        cardId,
        targetId,
      );
      setGameState(next);
      if (next.status !== "finished") scheduleHandoff();
    },
    [scheduleHandoff],
  );

  const handleDrawCard = useCallback(() => {
    const g = gameStateRef.current;
    if (!g) return;
    setActionTaken(true);
    const next = applyDrawCard(g, g.players[g.currentPlayerIndex].id);
    setGameState(next);
    scheduleHandoff();
  }, [scheduleHandoff]);

  if (gameState?.status === "finished" && gameState.winnerId) {
    const winner = gameState.players.find((p) => p.id === gameState.winnerId)!;
    return (
      <WinScreen
        winner={winner}
        onRestart={() => {
          setGameStatus("setup");
          setGameState(null);
        }}
      />
    );
  }

  if (gameStatus === "setup") {
    return <SetupScreen onStart={handleStart} />;
  }

  if (!gameState) return null;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  if (gameStatus === "handoff" && !showHand) {
    return (
      <HandoffScreen
        player={currentPlayer}
        onReveal={() => {
          play("yourTurn");
          setActionTaken(false);
          setShowHand(true);
          setGameStatus("playing");
        }}
      />
    );
  }

  return (
    <GameScreen
      gameState={gameState}
      currentPlayer={currentPlayer}
      actionTaken={actionTaken}
      onPlayCard={handlePlayCard}
      onDrawCard={handleDrawCard}
    />
  );
}
