// import { v } from "convex/values";
// import { mutation, query } from "./_generated/server";

// export const listOpenRooms = query({
//   handler: async (ctx) => {
//     return await ctx.db
//       .query("rooms")
//       .withIndex("by_status", (q) => q.eq("status", "waiting"))
//       .order("desc")
//       .take(20);
//   },
// });

// export const getRoom = query({
//   args: { roomId: v.id("rooms") },
//   handler: async (ctx, { roomId }) => {
//     return await ctx.db.get(roomId);
//   },
// });

// export const getRoomPlayers = query({
//   args: { roomId: v.id("rooms") },
//   handler: async (ctx, { roomId }) => {
//     return await ctx.db
//       .query("players")
//       .withIndex("by_room", (q) => q.eq("roomId", roomId))
//       .collect();
//   },
// });

// export const createRoom = mutation({
//   args: {
//     name: v.string(),
//     hostId: v.string(),
//     hostName: v.string(),
//     avatarUrl: v.optional(v.string()),
//     maxPlayers: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const roomId = await ctx.db.insert("rooms", {
//       name: args.name,
//       hostId: args.hostId,
//       hostName: args.hostName,
//       status: "waiting",
//       maxPlayers: args.maxPlayers,
//       playerIds: [args.hostId],
//       createdAt: Date.now(),
//     });

//     await ctx.db.insert("players", {
//       roomId,
//       userId: args.hostId,
//       name: args.hostName,
//       avatarUrl: args.avatarUrl,
//       isBot: false,
//       isReady: false,
//       isConnected: true,
//       hand: [],
//       seatIndex: 0,
//       suspicionLevel: 0,
//       chaosPoints: 0,
//       isFired: false,
//       currentZone: "lobby",
//       persistentCards: [],
//     });

//     return roomId;
//   },
// });

// export const joinRoom = mutation({
//   args: {
//     roomId: v.id("rooms"),
//     userId: v.string(),
//     userName: v.string(),
//     avatarUrl: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     const room = await ctx.db.get(args.roomId);
//     if (!room) throw new Error("Room not found");
//     if (room.status !== "waiting") throw new Error("Game already started");
//     if (room.playerIds.length >= room.maxPlayers) throw new Error("Room is full");
//     if (room.playerIds.includes(args.userId)) return args.roomId;

//     const players = await ctx.db
//       .query("players")
//       .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
//       .collect();

//     await ctx.db.patch(args.roomId, {
//       playerIds: [...room.playerIds, args.userId],
//     });

//     await ctx.db.insert("players", {
//       roomId: args.roomId,
//       userId: args.userId,
//       name: args.userName,
//       avatarUrl: args.avatarUrl,
//       isBot: false,
//       isReady: false,
//       isConnected: true,
//       hand: [],
//       seatIndex: players.length,
//       suspicionLevel: 0,
//       chaosPoints: 0,
//       isFired: false,
//       currentZone: "lobby",
//       persistentCards: [],
//     });

//     return args.roomId;
//   },
// });

// export const addBot = mutation({
//   args: {
//     roomId: v.id("rooms"),
//     requesterId: v.string(),
//   },
//   handler: async (ctx, args) => {
//     const room = await ctx.db.get(args.roomId);
//     if (!room) throw new Error("Room not found");
//     if (room.hostId !== args.requesterId) throw new Error("Only host can add bots");
//     if (room.playerIds.length >= room.maxPlayers) throw new Error("Room is full");

//     const botNames = ["Gremlin Kevin", "Gremlin Brenda", "Gremlin Derek"];
//     const players = await ctx.db
//       .query("players")
//       .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
//       .collect();

//     const botCount = players.filter((p) => p.isBot).length;
//     const botId = `bot_${Date.now()}`;
//     const botName = botNames[botCount] ?? `Bot Gremlin ${botCount + 1}`;

//     await ctx.db.patch(args.roomId, {
//       playerIds: [...room.playerIds, botId],
//     });

//     await ctx.db.insert("players", {
//       roomId: args.roomId,
//       userId: botId,
//       name: botName,
//       isBot: true,
//       isReady: true,
//       isConnected: true,
//       hand: [],
//       seatIndex: players.length,
//       suspicionLevel: 0,
//       chaosPoints: 0,
//       isFired: false,
//       currentZone: "lobby",
//       persistentCards: [],
//     });
//   },
// });

// export const setReady = mutation({
//   args: {
//     roomId: v.id("rooms"),
//     userId: v.string(),
//     isReady: v.boolean(),
//   },
//   handler: async (ctx, args) => {
//     const player = await ctx.db
//       .query("players")
//       .withIndex("by_user_room", (q) =>
//         q.eq("userId", args.userId).eq("roomId", args.roomId),
//       )
//       .first();
//     if (player) {
//       await ctx.db.patch(player._id, { isReady: args.isReady });
//     }
//   },
// });

// export const leaveRoom = mutation({
//   args: { roomId: v.id("rooms"), userId: v.string() },
//   handler: async (ctx, args) => {
//     const room = await ctx.db.get(args.roomId);
//     if (!room) return;

//     const player = await ctx.db
//       .query("players")
//       .withIndex("by_user_room", (q) =>
//         q.eq("userId", args.userId).eq("roomId", args.roomId),
//       )
//       .first();
//     if (player) await ctx.db.delete(player._id);

//     const newPlayerIds = room.playerIds.filter((id) => id !== args.userId);
//     if (newPlayerIds.length === 0) {
//       await ctx.db.delete(args.roomId);
//     } else {
//       const newHostId = newPlayerIds[0];
//       const hostPlayer = await ctx.db
//         .query("players")
//         .withIndex("by_user_room", (q) =>
//           q.eq("userId", newHostId).eq("roomId", args.roomId),
//         )
//         .first();
//       await ctx.db.patch(args.roomId, {
//         playerIds: newPlayerIds,
//         hostId: newHostId,
//         hostName: hostPlayer?.name ?? "Unknown",
//       });
//     }
//   },
// });

// export const sendMessage = mutation({
//   args: {
//     roomId: v.id("rooms"),
//     userId: v.string(),
//     userName: v.string(),
//     text: v.string(),
//   },
//   handler: async (ctx, args) => {
//     await ctx.db.insert("messages", {
//       roomId: args.roomId,
//       userId: args.userId,
//       userName: args.userName,
//       text: args.text,
//       createdAt: Date.now(),
//     });
//   },
// });

// export const getMessages = query({
//   args: { roomId: v.id("rooms") },
//   handler: async (ctx, { roomId }) => {
//     return await ctx.db
//       .query("messages")
//       .withIndex("by_room", (q) => q.eq("roomId", roomId))
//       .order("asc")
//       .take(50);
//   },
// });

// export const resetRoom = mutation({
//   args: { roomId: v.id("rooms") },
//   handler: async (ctx, { roomId }) => {
//     const room = await ctx.db.get(roomId);
//     if (!room) throw new Error("Room not found");

//     const oldGame = await ctx.db
//       .query("games")
//       .withIndex("by_room", (q) => q.eq("roomId", roomId))
//       .first();
//     if (oldGame) await ctx.db.delete(oldGame._id);

//     const players = await ctx.db
//       .query("players")
//       .withIndex("by_room", (q) => q.eq("roomId", roomId))
//       .collect();

//     for (const player of players) {
//       await ctx.db.patch(player._id, {
//         isReady: false,
//         hand: [],
//         suspicionLevel: 0,
//         chaosPoints: 0,
//         isFired: false,
//         currentZone: "lobby",
//         persistentCards: [],
//       });
//     }

//     await ctx.db.patch(roomId, { status: "waiting" });
//   },
// });

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { STARTING_HEALTH } from "../lib/roastRules";

export const listOpenRooms = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(20);
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db.get(roomId);
  },
});

export const getRoomPlayers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
  },
});

export const createRoom = mutation({
  args: {
    name: v.string(),
    hostId: v.string(),
    hostName: v.string(),
    avatarUrl: v.optional(v.string()),
    maxPlayers: v.number(),
  },
  handler: async (ctx, args) => {
    const roomId = await ctx.db.insert("rooms", {
      name: args.name,
      hostId: args.hostId,
      hostName: args.hostName,
      status: "waiting",
      maxPlayers: args.maxPlayers,
      playerIds: [args.hostId],
      createdAt: Date.now(),
    });

    await ctx.db.insert("players", {
      roomId,
      userId: args.hostId,
      name: args.hostName,
      avatarUrl: args.avatarUrl,
      isBot: false,
      isReady: false,
      isConnected: true,
      hand: [],
      seatIndex: 0,
      health: STARTING_HEALTH,
      isEliminated: false,
      shieldCards: [],
    });

    return roomId;
  },
});

export const joinRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.string(),
    userName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "waiting") throw new Error("Game already started");
    if (room.playerIds.length >= room.maxPlayers)
      throw new Error("Room is full");
    if (room.playerIds.includes(args.userId)) return args.roomId;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    await ctx.db.patch(args.roomId, {
      playerIds: [...room.playerIds, args.userId],
    });

    await ctx.db.insert("players", {
      roomId: args.roomId,
      userId: args.userId,
      name: args.userName,
      avatarUrl: args.avatarUrl,
      isBot: false,
      isReady: false,
      isConnected: true,
      hand: [],
      seatIndex: players.length,
      health: STARTING_HEALTH,
      isEliminated: false,
      shieldCards: [],
    });

    return args.roomId;
  },
});

export const addBot = mutation({
  args: {
    roomId: v.id("rooms"),
    requesterId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== args.requesterId)
      throw new Error("Only host can add bots");
    if (room.playerIds.length >= room.maxPlayers)
      throw new Error("Room is full");

    const botNames = ["Roaster Blaze", "Roaster Frost", "Roaster Chains"];
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const botCount = players.filter((p) => p.isBot).length;
    const botId = `bot_${Date.now()}`;
    const botName = botNames[botCount] ?? `Bot Roaster ${botCount + 1}`;

    await ctx.db.patch(args.roomId, {
      playerIds: [...room.playerIds, botId],
    });

    await ctx.db.insert("players", {
      roomId: args.roomId,
      userId: botId,
      name: botName,
      isBot: true,
      isReady: true,
      isConnected: true,
      hand: [],
      seatIndex: players.length,
      health: STARTING_HEALTH,
      isEliminated: false,
      shieldCards: [],
    });
  },
});

export const setReady = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.string(),
    isReady: v.boolean(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_user_room", (q) =>
        q.eq("userId", args.userId).eq("roomId", args.roomId),
      )
      .first();
    if (player) {
      await ctx.db.patch(player._id, { isReady: args.isReady });
    }
  },
});

export const leaveRoom = mutation({
  args: { roomId: v.id("rooms"), userId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return;

    const player = await ctx.db
      .query("players")
      .withIndex("by_user_room", (q) =>
        q.eq("userId", args.userId).eq("roomId", args.roomId),
      )
      .first();
    if (player) await ctx.db.delete(player._id);

    const newPlayerIds = room.playerIds.filter((id) => id !== args.userId);

    if (newPlayerIds.length === 0) {
      await ctx.db.delete(args.roomId);
    } else {
      const newHostId = newPlayerIds[0];
      const hostPlayer = await ctx.db
        .query("players")
        .withIndex("by_user_room", (q) =>
          q.eq("userId", newHostId).eq("roomId", args.roomId),
        )
        .first();
      await ctx.db.patch(args.roomId, {
        playerIds: newPlayerIds,
        hostId: newHostId,
        hostName: hostPlayer?.name ?? "Unknown",
      });
    }
  },
});

export const sendMessage = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.string(),
    userName: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      userId: args.userId,
      userName: args.userName,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

export const getMessages = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("asc")
      .take(50);
  },
});

export const resetRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");

    const oldGame = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .first();
    if (oldGame) await ctx.db.delete(oldGame._id);

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    for (const player of players) {
      await ctx.db.patch(player._id, {
        isReady: false,
        hand: [],
        health: STARTING_HEALTH,
        isEliminated: false,
        shieldCards: [],
      });
    }

    await ctx.db.patch(roomId, { status: "waiting" });
  },
});
