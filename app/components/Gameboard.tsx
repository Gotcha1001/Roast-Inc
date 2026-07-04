"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RoastCard, CardBack } from "./RoastCard";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Flame,
  Shield,
  ChevronDown,
  ChevronUp,
  Target as TargetIcon,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useBackground } from "../context/BackgroundContext";
import { useSoundManager } from "@/hooks/useSoundManager";
import {
  CARD_NAMES,
  STARTING_HEALTH,
  parseRoastCard,
  canPlayRoastCard,
  requiresTarget,
  type PlayContext,
} from "@/lib/roastRules";

interface Player {
  _id: Id<"players">;
  userId: string;
  name: string;
  avatarUrl?: string;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
  hand: string[];
  seatIndex: number;
  health: number;
  isEliminated: boolean;
  shieldCards: string[];
}

interface Game {
  _id: Id<"games">;
  roomId: Id<"rooms">;
  deck: string[];
  discardPile: string[];
  currentPlayerIndex: number;
  playerOrder: string[];
  lastTarget?: string;
  lastDamage?: number;
  lastAction: string;
  winnerId?: string;
  status: "active" | "finished";
  actionLog?: string[];
}

interface Room {
  _id: Id<"rooms">;
  name: string;
  hostId: string;
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  playerIds: string[];
}

// Shield/effect card badges shown under a player's name
const SHIELD_ICONS: Record<string, string> = {
  shield_no_u: "🔁",
  shield_deflect: "🛡️",
  shield_thick_skin: "🐘",
  shield_comeback_loaded: "💥",
  wild_reflect: "🪞",
  wild_double_down: "✖️2",
  wild_immunity: "✨",
};

// ─── Sub-components ───────────────────────────────────────────────────────

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
    <div className="flex gap-0.5 flex-wrap justify-center max-w-[90px]">
      {shieldCards.map((cardId, i) => (
        <span
          key={`${cardId}-${i}`}
          title={CARD_NAMES[cardId]?.name ?? cardId}
          className="text-[10px] leading-none px-1 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30"
        >
          {SHIELD_ICONS[cardId] ?? "🛡️"}
        </span>
      ))}
    </div>
  );
}

function TargetModal({
  players,
  cardId,
  onSelect,
  onCancel,
}: {
  players: Player[];
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
                key={player.userId}
                onClick={() => onSelect(player.userId)}
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

// Scrollable action log showing last 10 moves
function ActionLog({ log }: { log?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log, expanded]);

  if (!log || log.length === 0) return null;
  const recent = [...log].reverse();

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors w-full justify-center mb-1"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
        {expanded ? "Hide" : "Show"} move history ({log.length})
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="max-h-32 overflow-y-auto flex flex-col gap-1 px-2 py-2 rounded-xl bg-black/40 border border-white/10"
            >
              {recent.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-[9px] leading-relaxed px-2 py-1 rounded-lg ${
                    i === 0 ? "text-white/80 bg-white/10" : "text-white/30"
                  }`}
                >
                  {entry}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Gameboard ────────────────────────────────────────────────────────

export default function RoastGameboard({
  room,
  game,
  players,
  currentUserId,
}: {
  room: Room;
  game: Game;
  players: Player[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { selected: bg } = useBackground();
  const { play, setMuted } = useSoundManager();
  const [muted, setMutedState] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const playCardMutation = useMutation(api.game.playCard);
  const drawCardsMutation = useMutation(api.game.drawCards);

  const me = players.find((p) => p.userId === currentUserId);
  const currentPlayerUserId = game.playerOrder[game.currentPlayerIndex];
  const isMyTurn = currentPlayerUserId === currentUserId;
  const otherPlayers = players.filter((p) => p.userId !== currentUserId);
  const alivePlayers = players.filter((p) => !p.isEliminated);
  const currentPlayer = players.find((p) => p.userId === currentPlayerUserId);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  // Mirrors the server-side context construction in convex/game.ts so the
  // client can filter valid targets before ever hitting the server. The
  // server re-checks canPlayRoastCard authoritatively either way.
  function buildPlayContext(target: Player): PlayContext {
    const leaderId =
      alivePlayers.length > 0
        ? alivePlayers.reduce((best, p) => (p.health > best.health ? p : best))
            .userId
        : null;
    const idx = game.playerOrder.indexOf(currentUserId);
    const neighborLeftId =
      idx === -1 ? null : game.playerOrder[(idx + 1) % game.playerOrder.length];
    return {
      actorId: currentUserId,
      targetId: target.userId,
      leaderId,
      lastAttackerOfTarget:
        game.lastTarget === target.userId ? currentUserId : null,
      neighborLeftId,
      targetImmune: target.shieldCards.includes("wild_immunity"),
      targetShieldCards: target.shieldCards,
    };
  }

  function getValidTargets(cardId: string): Player[] {
    const candidates = alivePlayers.filter((p) => p.userId !== currentUserId);
    if (cardId === "wild_steal_shield") {
      return candidates.filter((p) => p.shieldCards.length > 0);
    }
    return candidates.filter((p) =>
      canPlayRoastCard(cardId, buildPlayContext(p)),
    );
  }

  async function handlePlayCard(cardId: string, targetId?: string) {
    if (!isMyTurn || !me) return;

    const { category } = parseRoastCard(cardId);
    if (category === "burn") play("cardSabotage");
    else if (category === "shield") play("cardExcuse");
    else if (category === "combo") play("cardTool");
    else play("cardWild");

    try {
      await playCardMutation({
        roomId: room._id,
        userId: currentUserId,
        cardId,
        targetId,
      });
      setPendingCard(null);
      setShowTargetModal(false);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to play card");
    }
  }

  function handleCardClick(cardId: string) {
    if (!isMyTurn || !me || me.isEliminated) return;

    if (!requiresTarget(cardId)) {
      handlePlayCard(cardId);
      return;
    }

    const validTargets = getValidTargets(cardId);
    if (validTargets.length === 0) {
      toast.error("🚫 No valid target for that card right now!");
      return;
    }
    setPendingCard(cardId);
    setShowTargetModal(true);
  }

  async function handleDraw() {
    if (!isMyTurn) return;
    play("cardDraw");
    try {
      await drawCardsMutation({ roomId: room._id, userId: currentUserId });
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to draw");
    }
  }

  if (!me) return null;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{
        background: bg.src
          ? `url(${bg.src}) center/cover no-repeat`
          : "radial-gradient(ellipse at 50% 40%, #2e0a0a 0%, #150404 60%, #050101 100%)",
      }}
    >
      {bg.overlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: bg.overlay }}
        />
      )}
      {game.lastDamage !== undefined && game.lastDamage >= 4 && (
        <motion.div
          key={game.lastAction}
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.35), transparent)",
          }}
        />
      )}

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/40 backdrop-blur-sm gap-2">
        <button
          onClick={() => router.push("/lobby")}
          className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">
            Now Roasting
          </span>
          <span className="text-sm font-black text-white truncate">
            {currentPlayer?.name ?? "?"}&apos;s Turn
          </span>
        </div>
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </header>

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Opponent area */}
        <div className="flex justify-center gap-4 pt-4 pb-2 px-4 flex-wrap">
          {otherPlayers.map((p) => (
            <div
              key={p.userId}
              className={`flex flex-col items-center gap-1.5 ${p.isEliminated ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border border-white/20 bg-black/30 text-white">
                <span className="truncate max-w-[80px]">
                  {p.isEliminated ? "☠️ ROASTED" : p.name}
                </span>
              </div>
              <div className="w-24">
                <HealthBar health={p.health} name="" />
              </div>
              <ShieldTray shieldCards={p.shieldCards} />
              <div className="flex items-end" style={{ height: "2.5rem" }}>
                {Array.from({ length: Math.min(p.hand.length, 5) }).map(
                  (_, j, arr) => {
                    const mid = (arr.length - 1) / 2;
                    return (
                      <div
                        key={j}
                        className="-ml-2 first:ml-0"
                        style={{
                          transform: `rotate(${(j - mid) * 6}deg) translateY(${Math.abs(j - mid) * 2}px)`,
                          transformOrigin: "bottom center",
                        }}
                      >
                        <CardBack size="sm" />
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Centre play area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={game.lastAction}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-xs text-center px-4 py-2 rounded-xl max-w-sm border border-white/15 bg-black/40 backdrop-blur-sm text-white/70"
            >
              {game.lastAction}
            </motion.div>
          </AnimatePresence>

          {isMyTurn && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold"
              style={{
                background: "rgba(239,68,68,0.2)",
                borderColor: "#ef4444",
                color: "#fca5a5",
                boxShadow: "0 0 24px rgba(239,68,68,0.4)",
              }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.span
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                🔥
              </motion.span>
              Your turn, drag them!
              <Flame size={14} className="text-red-400" />
            </motion.div>
          )}

          {isMyTurn && me.health <= STARTING_HEALTH * 0.25 && (
            <motion.div
              className="px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/50 text-red-300 text-xs font-bold text-center"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              💀 You&apos;re on the ropes --- play a Shield card!
            </motion.div>
          )}

          {/* Draw pile */}
          <div className="flex flex-col items-center gap-1">
            <motion.div
              className="relative cursor-pointer"
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.93 }}
              onClick={handleDraw}
              style={{
                filter: "drop-shadow(0 4px 16px rgba(239,68,68,0.5))",
              }}
            >
              <div className="absolute top-[3px] left-[2px] opacity-40">
                <CardBack size="lg" />
              </div>
              <div className="absolute top-[1.5px] left-[1px] opacity-65">
                <CardBack size="lg" />
              </div>
              <CardBack size="lg" />
            </motion.div>
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">
              Draw ({game.deck.length})
            </span>
          </div>

          <ActionLog log={game.actionLog} />
        </div>

        {/* My stats bar */}
        <div className="px-4 py-2 border-t border-white/10 bg-black/20 flex items-center gap-4">
          <div className="flex-1">
            <HealthBar health={me.health} name="Your HP" />
          </div>
          <ShieldTray shieldCards={me.shieldCards} />
          {me.isEliminated && (
            <div className="text-red-400 font-black text-sm">☠️ ROASTED</div>
          )}
        </div>

        {/* Hand */}
        <div
          className="relative border-t border-white/10 bg-black/50 backdrop-blur-md px-4 pt-3 pb-4"
          style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
              Your Burn Book ({me.hand.length})
            </span>
            {me.hand.length === 1 && !me.isEliminated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1 rounded-full font-black text-xs"
                style={{
                  background:
                    "linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)",
                  color: "white",
                  boxShadow: "0 0 20px rgba(239,68,68,0.6)",
                }}
              >
                LAST CARD 🔥
              </motion.div>
            )}
          </div>

          {isMyTurn && !me.isEliminated && (
            <p className="text-[9px] text-white/25 mb-2 text-center leading-relaxed">
              Tap a card to play it --- targeted cards will ask you to pick a
              victim
            </p>
          )}

          {me.isEliminated ? (
            <div className="text-center py-6 text-red-400 font-black text-lg">
              ☠️ You&apos;ve been ROASTED OUT! ☠️
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5 max-h-48 overflow-y-auto overflow-x-visible pt-10 pb-1">
              {me.hand.map((cardId, i) => {
                const playable = isMyTurn && !me.isEliminated;
                return (
                  <RoastCard
                    key={`${cardId}-${i}`}
                    cardId={cardId}
                    size="md"
                    isPlayable={playable}
                    onClick={() => handleCardClick(cardId)}
                    index={i}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-3 flex justify-center min-h-[32px] items-center">
            {!isMyTurn && !me.isEliminated && (
              <p className="text-xs text-white/30">
                Waiting for {currentPlayer?.name ?? "the next roaster"}...
              </p>
            )}
            {isMyTurn && !me.isEliminated && (
              <button
                onClick={handleDraw}
                className="text-xs text-white/40 hover:text-white/70"
              >
                Play a card above, or draw and end your turn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTargetModal && pendingCard && (
          <TargetModal
            players={getValidTargets(pendingCard)}
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
