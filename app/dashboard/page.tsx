// "use client";

// import { useUserContext } from "../context/UserContext";
// import { useUser } from "@clerk/nextjs";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { motion } from "framer-motion";
// import { Button } from "@/components/ui/button";
// import Link from "next/link";
// import {
//   Users,
//   Gamepad2,
//   Trophy,
//   Clock,
//   Swords,
//   TrendingUp,
// } from "lucide-react";
// import { Id } from "@/convex/_generated/dataModel";

// interface Game {
//   _id: Id<"games">;
//   playerOrder: string[];
//   winnerId?: string;
//   createdAt: number;
//   discardPile: string[];
//   status: "active" | "finished";
// }

// function estimateDurationSeconds(game: Game): number {
//   return Math.max(1, Math.floor(game.discardPile.length * 1.8));
// }

// function formatAvgDuration(seconds: number): string {
//   if (seconds < 60) return `${seconds}s`;
//   const m = Math.floor(seconds / 60);
//   const s = seconds % 60;
//   return s > 0 ? `${m}m ${s}s` : `${m}m`;
// }

// export default function DashboardPage() {
//   const user = useUserContext();
//   const { user: clerkUser } = useUser();

//   const games = useQuery(
//     api.game.getFinishedGamesForUser,
//     clerkUser ? { userId: clerkUser.id } : "skip",
//   );

//   const allGames = useQuery(api.game.getFinishedGames);

//   // ── Compute personal stats ──────────────────────────────────────────────────
//   const totalGames = games?.length ?? 0;
//   const wins = games?.filter((g) => g.winnerId === clerkUser?.id).length ?? 0;
//   const losses = totalGames - wins;
//   const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

//   const avgDuration =
//     games && games.length > 0
//       ? formatAvgDuration(
//           Math.round(
//             games.reduce((sum, g) => sum + estimateDurationSeconds(g), 0) /
//               games.length,
//           ),
//         )
//       : "—";

//   // ── Current win/loss streak ─────────────────────────────────────────────────
//   const streak = (() => {
//     if (!games || !clerkUser) return null;
//     const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt);
//     if (sorted.length === 0) return null;
//     const lastWon = sorted[0].winnerId === clerkUser.id;
//     let count = 0;
//     for (const g of sorted) {
//       if ((g.winnerId === clerkUser.id) === lastWon) count++;
//       else break;
//     }
//     return { won: lastWon, count };
//   })();

//   // ── Active players (unique users across last 50 finished games) ─────────────
//   const activePlayers = allGames
//     ? new Set(
//         allGames.flatMap((g) =>
//           g.playerOrder.filter((id) => !id.startsWith("bot_")),
//         ),
//       ).size
//     : null;

//   // ── Loading state ───────────────────────────────────────────────────────────
//   const isLoading = games === undefined;

//   const STAT_CARDS = [
//     {
//       label: "Games Played",
//       value: isLoading ? "…" : totalGames || "—",
//       icon: Gamepad2,
//       color: "text-purple-600 dark:text-purple-400",
//       sub: totalGames > 0 ? `${wins}W / ${losses}L` : null,
//     },
//     {
//       label: "Wins",
//       value: isLoading ? "…" : wins || "—",
//       icon: Trophy,
//       color: "text-yellow-600 dark:text-yellow-400",
//       sub: totalGames > 0 ? `${winRate}% win rate` : null,
//     },
//     {
//       label: "Players Online",
//       value: activePlayers ?? "…",
//       icon: Users,
//       color: "text-green-600 dark:text-green-400",
//       sub: "in last 50 games",
//     },
//     {
//       label: "Avg. Game Time",
//       value: isLoading ? "…" : avgDuration,
//       icon: Clock,
//       color: "text-blue-600 dark:text-blue-400",
//       sub: totalGames > 0 ? `over ${totalGames} games` : null,
//     },
//   ];

//   return (
//     <div className="max-w-5xl mx-auto">
//       {/* Welcome header */}
//       <motion.div
//         className="mb-8"
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5 }}
//       >
//         <h1 className="text-3xl font-bold text-black dark:text-white">
//           Welcome back{user?.name ? `, ${user.name}` : ""}! 👋
//         </h1>
//         <p className="text-gray-500 dark:text-purple-300 mt-1">
//           Ready to play? Jump into the lobby or check your stats.
//         </p>
//       </motion.div>

//       {/* Streak banner — only show when there's a streak of 2+ */}
//       {streak && streak.count >= 2 && (
//         <motion.div
//           initial={{ opacity: 0, scale: 0.95 }}
//           animate={{ opacity: 1, scale: 1 }}
//           className={`mb-6 px-5 py-3 rounded-2xl flex items-center gap-3 border ${
//             streak.won
//               ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700"
//               : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800"
//           }`}
//         >
//           <span className="text-2xl">{streak.won ? "🔥" : "❄️"}</span>
//           <p className="text-sm font-semibold text-black dark:text-white">
//             {streak.won
//               ? `You're on a ${streak.count}-game win streak! Keep it up.`
//               : `${streak.count}-game loss streak — time for a comeback!`}
//           </p>
//         </motion.div>
//       )}

//       {/* Stats grid */}
//       <motion.div
//         className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
//         initial="hidden"
//         animate="visible"
//         variants={{
//           hidden: {},
//           visible: { transition: { staggerChildren: 0.1 } },
//         }}
//       >
//         {STAT_CARDS.map(({ label, value, icon: Icon, color, sub }) => (
//           <motion.div
//             key={label}
//             className="p-5 rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40 shadow-sm"
//             variants={{
//               hidden: { opacity: 0, y: 20 },
//               visible: { opacity: 1, y: 0 },
//             }}
//           >
//             <Icon className={`h-6 w-6 mb-2 ${color}`} />
//             <div className="text-2xl font-bold text-black dark:text-white">
//               {value}
//             </div>
//             <div className="text-sm text-gray-500 dark:text-purple-300">
//               {label}
//             </div>
//             {sub && (
//               <div className="text-xs text-gray-400 dark:text-purple-500 mt-0.5">
//                 {sub}
//               </div>
//             )}
//           </motion.div>
//         ))}
//       </motion.div>

//       {/* Win rate bar — only show when there's data */}
//       {totalGames > 0 && (
//         <motion.div
//           className="p-5 rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40 shadow-sm mb-6"
//           initial={{ opacity: 0, y: 16 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.25 }}
//         >
//           <div className="flex items-center justify-between mb-3">
//             <div className="flex items-center gap-2">
//               <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
//               <span className="text-sm font-semibold text-black dark:text-white">
//                 Win Rate
//               </span>
//             </div>
//             <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
//               {winRate}%
//             </span>
//           </div>
//           <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-purple-900/50 overflow-hidden">
//             <motion.div
//               className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
//               initial={{ width: 0 }}
//               animate={{ width: `${winRate}%` }}
//               transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
//             />
//           </div>
//           <div className="flex justify-between mt-1.5 text-xs text-gray-400 dark:text-purple-500">
//             <span>{wins} wins</span>
//             <span>{losses} losses</span>
//           </div>
//         </motion.div>
//       )}

//       {/* Recent form — last 5 games as W/L dots */}
//       {games && games.length > 0 && (
//         <motion.div
//           className="p-5 rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40 shadow-sm mb-6"
//           initial={{ opacity: 0, y: 16 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.3 }}
//         >
//           <div className="flex items-center gap-2 mb-3">
//             <Swords className="h-4 w-4 text-purple-600 dark:text-purple-400" />
//             <span className="text-sm font-semibold text-black dark:text-white">
//               Recent Form
//             </span>
//           </div>
//           <div className="flex items-center gap-2">
//             {[...games]
//               .sort((a, b) => b.createdAt - a.createdAt)
//               .slice(0, 10)
//               .map((g, i) => {
//                 const won = g.winnerId === clerkUser?.id;
//                 return (
//                   <motion.div
//                     key={g._id}
//                     initial={{ opacity: 0, scale: 0.5 }}
//                     animate={{ opacity: 1, scale: 1 }}
//                     transition={{ delay: 0.35 + i * 0.05 }}
//                     title={won ? "Win" : "Loss"}
//                     className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
//                       won
//                         ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
//                         : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
//                     }`}
//                   >
//                     {won ? "W" : "L"}
//                   </motion.div>
//                 );
//               })}
//             {games.length > 10 && (
//               <span className="text-xs text-gray-400 dark:text-purple-500 ml-1">
//                 +{games.length - 10} more
//               </span>
//             )}
//           </div>
//         </motion.div>
//       )}

//       {/* Quick actions */}
//       <motion.div
//         className="p-6 rounded-2xl border border-gray-200 dark:border-purple-800 bg-white dark:bg-purple-950/40 shadow-sm"
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.35 }}
//       >
//         <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
//           Quick Actions
//         </h2>
//         <div className="flex flex-wrap gap-3">
//           <Link href="/lobby">
//             <Button className="bg-purple-600 hover:bg-purple-500 text-white">
//               <Users className="h-4 w-4 mr-2" /> Browse Lobby
//             </Button>
//           </Link>
//           <Link href="/lobby">
//             <Button
//               variant="outline"
//               className="border-purple-500 text-purple-600 dark:text-purple-400"
//             >
//               <Gamepad2 className="h-4 w-4 mr-2" /> Create Room
//             </Button>
//           </Link>
//           <Link href="/history">
//             <Button
//               variant="outline"
//               className="border-purple-500 text-purple-600 dark:text-purple-400"
//             >
//               <Trophy className="h-4 w-4 mr-2" /> View History
//             </Button>
//           </Link>
//         </div>
//       </motion.div>
//     </div>
//   );
// }

"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Zap, Trophy, Skull, Flame } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useUser();
  const games = useQuery(
    api.game.getFinishedGamesForUser,
    user ? { userId: user.id } : "skip",
  );

  const total = games?.length ?? 0;
  const wins = games?.filter((g) => g.winnerId === user?.id).length ?? 0;
  const roastedOut = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Current streak: consecutive wins (or losses) counting back from the
  // most recent finished game. `games` comes back oldest → newest, same
  // order the History page relies on.
  let streak = 0;
  let streakIsWins: boolean | null = null;
  if (games && games.length > 0) {
    for (let i = games.length - 1; i >= 0; i--) {
      const won = games[i].winnerId === user?.id;
      if (streakIsWins === null) {
        streakIsWins = won;
        streak = 1;
      } else if (won === streakIsWins) {
        streak++;
      } else {
        break;
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-700/30 flex items-center justify-center text-2xl">
            🔥
          </div>
          <div>
            <h1 className="text-2xl font-black text-black dark:text-white">
              {user?.firstName ?? "Roaster"}&apos;s Roast Sheet
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Your battle statistics
            </p>
          </div>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {[
          {
            label: "Total Games",
            value: total || "—",
            icon: Zap,
            color: "text-red-500",
          },
          {
            label: "Wins",
            value: wins || "—",
            icon: Trophy,
            color: "text-yellow-500",
          },
          {
            label: "Roasted Out",
            value: roastedOut || "—",
            icon: Skull,
            color: "text-gray-400",
          },
          {
            label: streakIsWins ? "Win Streak" : "Losing Streak",
            value: streak || "—",
            icon: Flame,
            color: streakIsWins ? "text-orange-500" : "text-gray-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm"
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Icon className={`h-5 w-5 mb-2 ${color}`} />
            <div className="text-2xl font-black text-black dark:text-white">
              {value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {label}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {total > 0 && (
        <div className="mb-8 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-black dark:text-white">
              Overall Win Rate
            </span>
            <span className="text-sm font-black text-red-500">{winRate}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
            <motion.div
              className="h-2.5 rounded-full bg-gradient-to-r from-gray-400 via-orange-400 to-red-500"
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/lobby">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 cursor-pointer group"
          >
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-lg font-black text-black dark:text-white group-hover:text-red-600">
              Start a Roast
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Join or create a game room
            </p>
          </motion.div>
        </Link>
        <Link href="/history">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 cursor-pointer group"
          >
            <div className="text-3xl mb-3">📜</div>
            <h3 className="text-lg font-black text-black dark:text-white group-hover:text-orange-500">
              Roast History
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your past matches
            </p>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
