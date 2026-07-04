"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Skull, Clock, Hash } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface Game {
  _id: Id<"games">;
  roomId: Id<"rooms">;
  playerOrder: string[];
  winnerId?: string;
  status: "active" | "finished";
  lastAction?: string;
  createdAt: number;
  discardPile: string[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function gameDuration(game: Game): string {
  // Estimate: ~2s per burn thrown down
  const estimated = Math.max(1, Math.floor(game.discardPile.length * 1.8));
  return estimated < 60
    ? `~${estimated}s`
    : `~${Math.floor(estimated / 60)}m ${estimated % 60}s`;
}

export default function HistoryPage() {
  const { user } = useUser();
  const router = useRouter();

  const games = useQuery(
    api.game.getFinishedGamesForUser,
    user ? { userId: user.id } : "skip",
  );

  if (!user) {
    router.push("/");
    return null;
  }

  const wins = games?.filter((g) => g.winnerId === user.id).length ?? 0;
  const losses = (games?.length ?? 0) - wins;
  const winRate =
    games && games.length > 0 ? Math.round((wins / games.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Roast History
        </h1>
        <p className="text-gray-500 dark:text-purple-300">
          Every burn you&apos;ve thrown and taken
        </p>
      </div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-3 gap-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {[
          {
            label: "Total Roasts",
            value: games?.length ?? "—",
            icon: Hash,
            color: "text-purple-600 dark:text-purple-400",
          },
          {
            label: "Wins",
            value: wins || "—",
            icon: Flame,
            color: "text-orange-500 dark:text-orange-400",
          },
          {
            label: "Win Rate",
            value: games?.length ? `${winRate}%` : "—",
            icon: Skull,
            color: "text-green-600 dark:text-green-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            className="p-4 rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40 shadow-sm"
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Icon className={`h-5 w-5 mb-1 ${color}`} />
            <div className="text-2xl font-bold text-black dark:text-white">
              {value}
            </div>
            <div className="text-xs text-gray-500 dark:text-purple-300">
              {label}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Game list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-purple-300 mb-4">
          Recent Roasts ({games?.length ?? 0})
        </h2>

        {games === undefined && (
          <div className="text-center py-12 text-gray-400 dark:text-purple-400">
            Loading history...
          </div>
        )}

        {games?.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40"
          >
            <div className="text-5xl mb-4">🔥</div>
            <p className="font-semibold text-black dark:text-white mb-1">
              No roasts yet
            </p>
            <p className="text-gray-500 dark:text-purple-300">
              Finish a game to see it here!
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {games?.map((game, i) => {
            const won = game.winnerId === user.id;
            const burnsThrown = game.discardPile.length;
            const opponents = game.playerOrder.filter((id) => id !== user.id);

            return (
              <motion.div
                key={game._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40 shadow-sm"
              >
                {/* Win/loss badge */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                    won
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                      : "bg-gray-100 dark:bg-purple-900/30 text-gray-400"
                  }`}
                >
                  {won ? "🔥" : "💀"}
                </div>

                {/* Game info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-semibold ${
                        won
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-gray-500 dark:text-purple-300"
                      }`}
                    >
                      {won ? "Roasted 'em" : "Got roasted"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-purple-500">
                      vs {opponents.length} opponent
                      {opponents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-purple-400 truncate">
                    {game.lastAction ?? "Roast finished"}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1 text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-purple-400">
                    <Clock size={11} />
                    {timeAgo(game.createdAt)}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-purple-500">
                    {burnsThrown} burns thrown
                  </div>
                  <div className="text-xs text-gray-400 dark:text-purple-500">
                    {gameDuration(game)} est.
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
