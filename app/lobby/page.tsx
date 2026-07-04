"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Plus, LogIn, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Room {
  _id: Id<"rooms">;
  name: string;
  hostId: string;
  hostName: string;
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  playerIds: string[];
  createdAt: number;
}

export default function LobbyPage() {
  const { user } = useUser();
  const router = useRouter();
  const openRooms = useQuery(api.rooms.listOpenRooms) as Room[] | undefined;
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const addBot = useMutation(api.rooms.addBot);
  const startGame = useMutation(api.game.startGame);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [soloLoading, setSoloLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) return null;

  const handleCreate = async () => {
    if (!roomName.trim()) return toast.error("Give your roast battle a name!");
    try {
      const roomId = await createRoom({
        name: roomName.trim(),
        hostId: user.id,
        hostName: user.fullName ?? user.username ?? "Unknown Roaster",
        avatarUrl: user.imageUrl,
        maxPlayers,
      });
      router.push(`/game/${roomId}`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to create room");
    }
  };

  const handleJoin = async (roomId: Id<"rooms">) => {
    setJoiningId(roomId);
    try {
      await joinRoom({
        roomId,
        userId: user.id,
        userName: user.fullName ?? user.username ?? "Unknown Roaster",
        avatarUrl: user.imageUrl,
      });
      router.push(`/game/${roomId}`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to join room");
      setJoiningId(null);
    }
  };

  const handleSolo = async () => {
    setSoloLoading(true);
    try {
      const roomId = await createRoom({
        name: "Solo Roast Battle",
        hostId: user.id,
        hostName: user.fullName ?? user.username ?? "Unknown Roaster",
        avatarUrl: user.imageUrl,
        maxPlayers: 2,
      });
      await addBot({ roomId, requesterId: user.id });
      await startGame({ roomId, requesterId: user.id });
      router.push(`/game/${roomId}`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to start solo game");
      setSoloLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-black dark:text-white flex items-center gap-2">
          🎤 The Roast Lobby
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Find a stage or start your own roast battle
        </p>
      </div>

      {/* Solo vs Bot */}
      <div className="p-5 rounded-2xl border border-red-800/40 bg-red-900/10 shadow-sm mb-6">
        <h2 className="text-base font-bold text-black dark:text-white mb-1 flex items-center gap-2">
          <Bot size={18} className="text-red-400" /> Solo vs Bot
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Jump straight in — you vs one ruthless bot roaster. No waiting room
          needed.
        </p>
        <Button
          className="w-full bg-red-700 hover:bg-red-600 text-white py-5 text-base font-bold"
          onClick={handleSolo}
          disabled={soloLoading}
        >
          {soloLoading ? "Warming up the mic..." : "🎤 Start Solo Roast"}
        </Button>
      </div>

      {/* Create Room */}
      <div className="p-5 rounded-2xl border border-gray-200 dark:border-red-900/30 bg-white dark:bg-gray-900/50 shadow-sm mb-6">
        <h2 className="text-base font-bold text-black dark:text-white mb-4 flex items-center gap-2">
          <Plus size={18} className="text-red-500" />
          Book a Stage
        </h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Name your stage (e.g. 'The Roast of the Century')"
            className="px-4 py-3 rounded-xl text-sm outline-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-400"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Max Roasters:
            </label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${maxPlayers === n ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-100"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white px-6"
              onClick={handleCreate}
              disabled={!roomName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </div>

      {/* Open Rooms */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
          Open Stages ({openRooms?.length ?? 0})
        </h2>
        {openRooms === undefined && (
          <div className="text-center py-12 text-gray-400">
            Scanning the green room...
          </div>
        )}
        {openRooms?.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-10 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"
          >
            <div className="text-5xl mb-3">🎤</div>
            <p className="font-bold text-black dark:text-white mb-1">
              No open stages
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Book one and invite your roasters!
            </p>
          </motion.div>
        )}
        <div className="space-y-3">
          <AnimatePresence>
            {openRooms?.map((room, i) => {
              const isFull = room.playerIds.length >= room.maxPlayers;
              return (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-900/30 flex items-center justify-center text-2xl flex-shrink-0">
                    🎤
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-black dark:text-white truncate">
                      {room.name}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Users size={11} />
                        {room.playerIds.length}/{room.maxPlayers}
                      </span>
                      <span className="text-xs text-gray-400">
                        Host: {room.hostName}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => !isFull && handleJoin(room._id)}
                    disabled={isFull || joiningId === room._id}
                    className={
                      isFull
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-500 text-white"
                    }
                  >
                    <LogIn size={14} className="mr-1" />
                    {isFull
                      ? "Full"
                      : joiningId === room._id
                        ? "Joining..."
                        : "Join"}
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
