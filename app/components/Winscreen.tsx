"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSoundManager } from "@/hooks/useSoundManager";
import { useEffect } from "react";

interface WinscreenProps {
  winnerId: string;
  currentUserId: string;
  winnerName: string;
  finalHealth?: number;
  onPlayAgain: () => void;
  onLeave: () => void;
}

const WIN_MESSAGES = [
  "Mic drop. Nobody in that room is recovering from that.",
  "You roasted everyone into silence. Legendary.",
  "The crowd is still gasping. You ate.",
  "Undefeated. The other roasters are drafting apology tweets.",
  "You left the stage untouched and everyone else in ashes.",
];

const LOSE_MESSAGES = [
  "That burn had your name on it. Literally.",
  "You brought jokes to a roast and got roasted instead.",
  "HP hit zero. So did your comeback game.",
  "Cooked. Absolutely cooked.",
  "Better luck next round — bring thicker skin.",
];

// Pre-computed at module load — never changes, never re-runs during render
const PARTICLE_TIMINGS = Array.from({ length: 12 }, () => ({
  duration: 3 + Math.random() * 2,
  delay: Math.random() * 2,
}));

const WIN_MSG_INDEX = Math.floor(Math.random() * WIN_MESSAGES.length);
const LOSE_MSG_INDEX = Math.floor(Math.random() * LOSE_MESSAGES.length);

export default function Winscreen({
  winnerId,
  currentUserId,
  winnerName,
  onPlayAgain,
  onLeave,
  finalHealth = 0,
}: WinscreenProps) {
  const { play } = useSoundManager();
  const isWinner = winnerId === currentUserId;

  useEffect(() => {
    play(isWinner ? "roastWin" : "roastLose");
  }, []);

  const message = isWinner
    ? WIN_MESSAGES[WIN_MSG_INDEX]
    : LOSE_MESSAGES[LOSE_MSG_INDEX];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6 text-center"
      style={{
        background: isWinner
          ? "radial-gradient(ellipse at 50% 40%, #451a03 0%, #1c0a01 60%, #080301 100%)"
          : "radial-gradient(ellipse at 50% 40%, #2e0a0a 0%, #150505 60%, #080202 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLE_TIMINGS.map((timing, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            style={{ left: `${(i / 12) * 100}%`, top: "-10%" }}
            animate={{ y: ["0vh", "110vh"] }}
            transition={{
              duration: timing.duration,
              delay: timing.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {isWinner
              ? ["🎤", "🔥", "😂", "💀"][i % 4]
              : ["🔥", "💀", "😔", "🎯"][i % 4]}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 max-w-md w-full"
      >
        <motion.div
          className="text-8xl mb-6"
          animate={
            isWinner
              ? { rotate: [0, -10, 10, -10, 0] }
              : { scale: [1, 0.95, 1] }
          }
          transition={{
            duration: 0.6,
            delay: 0.4,
            repeat: isWinner ? 3 : Infinity,
          }}
        >
          {isWinner ? "🎤" : "🔥"}
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
          {isWinner ? "MIC DROP VICTORY!" : "YOU GOT ROASTED!"}
        </h1>
        <p className="text-lg text-white/70 mb-2">
          {isWinner
            ? `${winnerName} owns the stage`
            : `${winnerName} took the win`}
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-white/50 italic mb-6 px-4"
        >
          &quot;{message}&quot;
        </motion.p>

        {isWinner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6 px-5 py-3 rounded-2xl bg-red-900/30 border border-red-500/30"
          >
            <div className="text-red-400 font-black text-3xl">
              {finalHealth} HP
            </div>
            <div className="text-red-300/60 text-xs">Health Remaining</div>
          </motion.div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            className="py-5 text-lg bg-red-700 hover:bg-red-600 text-white shadow-lg"
            onClick={onPlayAgain}
          >
            🎤 Start Another Roast
          </Button>
          <Button
            variant="outline"
            className="py-4 border-white/20 text-white/60 hover:text-white hover:bg-white/10"
            onClick={onLeave}
          >
            Leave the Stage
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
