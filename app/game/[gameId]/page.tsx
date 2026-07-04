"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Winscreen from "@/app/components/Winscreen";
import RoastGameboard from "@/app/components/Gameboard";

export default function GamePage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const roomId = params.gameId as Id<"rooms">;

  const room = useQuery(api.rooms.getRoom, { roomId });
  const game = useQuery(api.game.getGame, { roomId });
  const players = useQuery(api.rooms.getRoomPlayers, { roomId });
  const resetRoom = useMutation(api.rooms.resetRoom);

  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

  if (!user || !room || !game || !players) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white/50 text-sm animate-pulse">
          Warming up the mic...
        </div>
      </div>
    );
  }

  if (game.status === "finished" && game.winnerId) {
    const winner = players.find((p) => p.userId === game.winnerId);
    return (
      <Winscreen
        winnerId={game.winnerId}
        currentUserId={user.id}
        winnerName={winner?.name ?? "Unknown Roaster"}
        finalHealth={winner?.health ?? 0}
        onPlayAgain={async () => {
          await resetRoom({ roomId });
          router.push("/lobby");
        }}
        onLeave={() => router.push("/lobby")}
      />
    );
  }

  if (room.status === "waiting") {
    router.push("/lobby");
    return null;
  }

  return (
    <RoastGameboard
      room={room}
      game={game}
      players={players}
      currentUserId={user.id}
    />
  );
}
