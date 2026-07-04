"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Copy, Check, UserPlus, Play, Bot } from "lucide-react";
import { toast } from "sonner";

const ROASTER_PERSONAS = [
  {
    id: "blaze",
    name: "Blaze",
    emoji: "🔥",
    specialty: "Straight Burns",
    color: "#ef4444",
  },
  {
    id: "frost",
    name: "Frost",
    emoji: "🧊",
    specialty: "Ice-Cold Shields",
    color: "#3b82f6",
  },
  {
    id: "chains",
    name: "Chains",
    emoji: "⛓️",
    specialty: "Combo Chains",
    color: "#f97316",
  },
  {
    id: "sniper",
    name: "Sniper",
    emoji: "🎯",
    specialty: "Precision Callouts",
    color: "#a855f7",
  },
  {
    id: "joker",
    name: "Joker",
    emoji: "🃏",
    specialty: "Wildcard Chaos",
    color: "#eab308",
  },
  {
    id: "mic",
    name: "Mic",
    emoji: "🎤",
    specialty: "Freestyle Bars",
    color: "#22c55e",
  },
];

interface WaitingRoomProps {
  room: {
    _id: string;
    name: string;
    hostId: string;
    maxPlayers: number;
    playerIds: string[];
  };
  players: Array<{
    userId: string;
    name: string;
    avatarUrl?: string;
    isBot: boolean;
    isReady: boolean;
  }>;
  currentUserId: string;
  onStart: () => void;
  onReady: (isReady: boolean) => void;
  onAddBot: () => void;
  onLeave: () => void;
}

export default function WaitingRoom({
  room,
  players,
  currentUserId,
  onStart,
  onReady,
  onAddBot,
  onLeave,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("blaze");

  const isHost = room.hostId === currentUserId;
  const me = players.find((p) => p.userId === currentUserId);
  const allReady = players.every((p) => p.isBot || p.isReady);
  const canStart = isHost && players.length >= 2 && allReady;

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(room._id);
    setCopied(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gray-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-red-900 opacity-20"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎤</div>
          <h1 className="text-3xl font-black text-white">{room.name}</h1>
          <p className="text-red-400/70 text-sm mt-1">
            {players.length}/{room.maxPlayers} roasters assembled
          </p>
        </div>

        <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-white/5 text-center">
          <p className="text-white/40 text-xs mb-2 uppercase tracking-widest">
            Room Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-white font-mono text-sm bg-black/30 px-3 py-2 rounded-lg border border-white/10">
              {room._id.slice(-8).toUpperCase()}
            </code>
            <button
              onClick={copyRoomId}
              className="p-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:bg-white/10"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-white/5">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
            Choose Your Roaster Persona
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ROASTER_PERSONAS.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => setSelectedPersona(p.id)}
                className={`p-2.5 rounded-xl border-2 text-center transition-all ${selectedPersona === p.id ? "border-red-500 bg-red-900/30" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="text-2xl mb-1">{p.emoji}</div>
                <div className="text-white text-[11px] font-bold">{p.name}</div>
                <div className="text-white/40 text-[9px]">{p.specialty}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
            Roasters on the Stage
          </p>
          <AnimatePresence>
            {players.map((player) => (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5"
              >
                <div className="w-9 h-9 rounded-full bg-red-700 flex items-center justify-center text-lg flex-shrink-0">
                  {player.isBot ? "🤖" : ROASTER_PERSONAS[0].emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">
                    {player.name}
                    {player.userId === room.hostId && (
                      <span className="ml-2 text-yellow-400 text-[10px]">
                        👑 HOST
                      </span>
                    )}
                    {player.isBot && (
                      <span className="ml-2 text-blue-400 text-[10px]">
                        🤖 BOT
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${player.isReady || player.isBot ? "bg-green-900/50 text-green-400 border border-green-500/30" : "bg-yellow-900/50 text-yellow-400 border border-yellow-500/30"}`}
                >
                  {player.isReady || player.isBot ? "✅ READY" : "⏳ WAITING"}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length < room.maxPlayers && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 text-white/30 text-sm">
              <UserPlus size={18} />
              Waiting for more roasters...
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!me?.isReady && !isHost && (
            <Button
              className="py-5 bg-red-700 hover:bg-red-600 text-white"
              onClick={() => onReady(true)}
            >
              ✅ I&apos;m Ready to Roast
            </Button>
          )}
          {me?.isReady && !isHost && (
            <Button
              variant="outline"
              className="py-4 border-white/20 text-white/60"
              onClick={() => onReady(false)}
            >
              ⏳ Not Ready Yet
            </Button>
          )}
          {isHost && players.length < room.maxPlayers && (
            <Button
              variant="outline"
              className="py-4 border-blue-500/30 text-blue-400 hover:bg-blue-900/20"
              onClick={onAddBot}
            >
              <Bot size={16} className="mr-2" />
              Add Bot Roaster
            </Button>
          )}
          {isHost && (
            <Button
              className={`py-5 text-lg ${canStart ? "bg-red-600 hover:bg-red-500 text-white shadow-lg" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
              onClick={canStart ? onStart : undefined}
              disabled={!canStart}
            >
              <Play size={18} className="mr-2" />
              {canStart
                ? "Start the Roast! 🎤"
                : "Waiting for all roasters to ready up..."}
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-white/40 hover:text-white/60"
            onClick={onLeave}
          >
            Leave Stage
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
