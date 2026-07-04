import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  CARD_NAMES,
  STARTING_HEALTH,
  STARTING_HAND_SIZE,
  MAX_HAND_SIZE,
  shuffle,
  createRoastDeck,
  parseRoastCard,
  canPlayRoastCard,
  resolveDamage,
  isEliminated,
  checkWinner,
  appendActionLog,
  type PlayContext,
  type DamageResult,
} from "../lib/roastRules";

// Re-export so any existing imports of these from "@/convex/game" still
// resolve during the migration — but new code (and the client) should pull
// these from "@/lib/roastRules" directly, since that file has no Convex
// server dependencies and is safe to import from the browser.
export { CARD_NAMES, createRoastDeck, parseRoastCard, canPlayRoastCard };

type PlayerDoc = Doc<"players">;
type GameDoc = Doc<"games">;

// ─── Queries ────────────────────────────────────────────────────────────

export const getGame = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .first();
  },
});

export const getFinishedGamesForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db.query("games").collect();
    return all
      .filter((g) => g.status === "finished" && g.playerOrder.includes(userId))
      .slice(-50);
  },
});

export const getFinishedGames = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("games").collect();
    return all.filter((g) => g.status === "finished").slice(-50);
  },
});

// ─── Start Game ─────────────────────────────────────────────────────────

export const startGame = mutation({
  args: { roomId: v.id("rooms"), requesterId: v.string() },
  handler: async (ctx, { roomId, requesterId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== requesterId) throw new Error("Only host can start");
    if (room.playerIds.length < 2) throw new Error("Need at least 2 players");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const sorted = players.sort((a, b) => a.seatIndex - b.seatIndex);
    const playerOrder = sorted.map((p) => p.userId);

    const deck = createRoastDeck();
    for (const player of sorted) {
      const hand = deck.splice(0, STARTING_HAND_SIZE);
      await ctx.db.patch(player._id, {
        hand,
        health: STARTING_HEALTH,
        isEliminated: false,
        shieldCards: [], // also doubles as "active effects" — see playCardLogic notes
      });
    }

    await ctx.db.patch(roomId, { status: "playing" });

    const openingAction = "🎤 The roast battle begins. No mercy.";
    await ctx.db.insert("games", {
      roomId,
      deck,
      discardPile: [],
      currentPlayerIndex: 0,
      playerOrder,
      lastTarget: undefined,
      lastDamage: undefined,
      lastAction: openingAction,
      actionLog: [openingAction],
      status: "active",
      createdAt: Date.now(),
    });
  },
});

// ─── Draw Cards ─────────────────────────────────────────────────────────

async function drawCardsLogic(
  ctx: MutationCtx,
  {
    roomId,
    userId,
    count = 1,
  }: { roomId: Id<"rooms">; userId: string; count?: number },
) {
  const game = await ctx.db
    .query("games")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .first();
  if (!game || game.status !== "active") throw new Error("No active game");

  const player = await ctx.db
    .query("players")
    .withIndex("by_user_room", (q) =>
      q.eq("userId", userId).eq("roomId", roomId),
    )
    .first();
  if (!player) throw new Error("Player not found");

  const currentUserId = game.playerOrder[game.currentPlayerIndex];
  if (currentUserId !== userId) throw new Error("Not your turn");
  if (player.hand.length >= MAX_HAND_SIZE) throw new Error("Hand is full");

  let deck = [...game.deck];
  if (deck.length < count) {
    deck = [...deck, ...shuffle(game.discardPile)];
  }
  const drawn = deck.splice(0, count);
  await ctx.db.patch(player._id, { hand: [...player.hand, ...drawn] });

  const { nextIndex, nextUserId } = advanceTurn(game);
  const action = `${player.name} draws a card 🃏`;
  await ctx.db.patch(game._id, {
    deck,
    lastAction: action,
    currentPlayerIndex: nextIndex,
    actionLog: appendActionLog(game.actionLog, action),
  });

  if (nextUserId.startsWith("bot_")) {
    await ctx.scheduler.runAfter(1200, internal.game.triggerBotTurn, {
      roomId,
    });
  }
}

export const drawCards = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => drawCardsLogic(ctx, args),
});

// ─── Play Card ──────────────────────────────────────────────────────────

async function playCardLogic(
  ctx: MutationCtx,
  {
    roomId,
    userId,
    cardId,
    targetId,
  }: { roomId: Id<"rooms">; userId: string; cardId: string; targetId?: string },
) {
  const game = await ctx.db
    .query("games")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .first();
  if (!game || game.status !== "active") throw new Error("No active game");

  const currentUserId = game.playerOrder[game.currentPlayerIndex];
  if (currentUserId !== userId) throw new Error("Not your turn");

  const allPlayers = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  const actor = allPlayers.find((p) => p.userId === userId);
  if (!actor || actor.isEliminated)
    throw new Error("You are eliminated or not found");

  const cardIdx = actor.hand.indexOf(cardId);
  if (cardIdx === -1) throw new Error("Card not in hand");

  const { category } = parseRoastCard(cardId);
  const alivePlayers = allPlayers.filter((p) => !p.isEliminated);

  // Remove the card from hand up front; individual branches may re-add it
  // to shieldCards (equip) instead of the discard pile.
  const newHand = [...actor.hand];
  newHand.splice(cardIdx, 1);

  let lastAction = `${actor.name} played ${CARD_NAMES[cardId]?.name ?? cardId}`;
  let discardPile = [...game.discardPile, cardId];
  let winnerId: string | undefined;

  // ── Shield / equip cards: no target, just goes active on the actor ──
  if (category === "shield") {
    discardPile = game.discardPile; // not discarded — it's equipped
    await ctx.db.patch(actor._id, {
      hand: newHand,
      shieldCards: [...actor.shieldCards, cardId],
    });
    lastAction = `${actor.name} readies ${CARD_NAMES[cardId]?.name ?? cardId} 🛡️`;
  }
  // ── Wild cards with no target (self-buffs) ──
  else if (
    cardId === "wild_reflect" ||
    cardId === "wild_double_down" ||
    cardId === "wild_immunity"
  ) {
    discardPile = game.discardPile;
    await ctx.db.patch(actor._id, {
      hand: newHand,
      shieldCards: [...actor.shieldCards, cardId], // reused as "active effects" list
    });
    lastAction = `${actor.name} activates ${CARD_NAMES[cardId]?.name ?? cardId} ✨`;
  }
  // ── Steal shield: targets a player, takes one of their shield/effect cards ──
  else if (cardId === "wild_steal_shield") {
    const target = allPlayers.find((p) => p.userId === targetId);
    if (!target) throw new Error("No target selected");
    if (target.shieldCards.length === 0)
      throw new Error("Target has nothing to steal");
    const stolen = target.shieldCards[0];
    await ctx.db.patch(target._id, {
      shieldCards: target.shieldCards.slice(1),
    });
    await ctx.db.patch(actor._id, {
      hand: newHand,
      shieldCards: [...actor.shieldCards, stolen],
    });
    lastAction = `${actor.name} steals ${CARD_NAMES[stolen]?.name ?? stolen} from ${target.name} 🧲`;
  }
  // ── Group roast: hits every other alive player for base damage ──
  else if (cardId === "wild_group_roast") {
    const baseDamage = CARD_NAMES[cardId]?.damage ?? 2;
    const hits: string[] = [];
    for (const target of alivePlayers.filter((p) => p.userId !== userId)) {
      const result = resolveDamage(
        cardId,
        baseDamage,
        target.shieldCards,
        target.shieldCards.includes("wild_reflect"),
        false,
      );
      await applyDamageResult(ctx, actor, target, result);
      hits.push(target.name);
    }
    await ctx.db.patch(actor._id, { hand: newHand });
    lastAction = `${actor.name} roasts the whole table 🎪 (${hits.join(", ")})`;
    winnerId = checkWinner(await currentHealths(ctx, roomId)) ?? undefined;
  }
  // ── Everything else (burn / combo / targeted): single-target damage ──
  else {
    const target = allPlayers.find((p) => p.userId === targetId);
    if (!target) throw new Error("No target selected");

    const ctxForCheck: PlayContext = {
      actorId: userId,
      targetId: target.userId,
      leaderId: computeLeaderId(alivePlayers),
      lastAttackerOfTarget:
        game.lastTarget === target.userId ? currentUserId : null,
      neighborLeftId: computeLeftNeighbor(game.playerOrder, userId),
      targetImmune: target.shieldCards.includes("wild_immunity"),
      targetShieldCards: target.shieldCards,
    };
    if (!canPlayRoastCard(cardId, ctxForCheck)) {
      throw new Error("Cannot play that card on that target right now");
    }

    const doubleDownActive = actor.shieldCards.includes("wild_double_down");
    const baseDamage = CARD_NAMES[cardId]?.damage ?? 0;
    const result = resolveDamage(
      cardId,
      baseDamage,
      target.shieldCards,
      target.shieldCards.includes("wild_reflect"),
      doubleDownActive,
    );

    const actorShieldsAfter = doubleDownActive
      ? actor.shieldCards.filter((c) => c !== "wild_double_down")
      : actor.shieldCards;
    await ctx.db.patch(actor._id, {
      hand: newHand,
      shieldCards: actorShieldsAfter,
    });

    await applyDamageResult(ctx, actor, target, result);

    lastAction =
      result.finalDamage > 0
        ? `${actor.name} hits ${target.name} with ${CARD_NAMES[cardId]?.name ?? cardId} for ${result.finalDamage} 💥`
        : `${target.name} blocks ${actor.name}'s ${CARD_NAMES[cardId]?.name ?? cardId} 🛡️`;

    winnerId = checkWinner(await currentHealths(ctx, roomId)) ?? undefined;
  }

  const { nextIndex, nextUserId } = advanceTurn(game);
  await ctx.db.patch(game._id, {
    discardPile,
    lastTarget: targetId,
    currentPlayerIndex: nextIndex,
    lastAction,
    actionLog: appendActionLog(game.actionLog, lastAction),
    ...(winnerId ? { status: "finished" as const, winnerId } : {}),
  });

  if (!winnerId && nextUserId.startsWith("bot_")) {
    await ctx.scheduler.runAfter(1500, internal.game.triggerBotTurn, {
      roomId,
    });
  }
}

export const playCard = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.string(),
    cardId: v.string(),
    targetId: v.optional(v.string()),
  },
  handler: async (ctx, args) => playCardLogic(ctx, args),
});

// ─── Bot Turn ───────────────────────────────────────────────────────────
// Calls the *Logic functions directly instead of ctx.runMutation-ing a
// public mutation from within another mutation — that self-invocation
// pattern needs an `as any` cast to sidestep the circular type reference
// (internal.game.playCard's return type depends on the file that's still
// being type-checked) and adds a pointless extra transaction. Calling the
// shared function directly keeps everything in one transaction and fully typed.

export const triggerBotTurn = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .first();
    if (!game || game.status !== "active") return;

    const botId = game.playerOrder[game.currentPlayerIndex];
    if (!botId.startsWith("bot_")) return;

    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const bot = allPlayers.find((p) => p.userId === botId);
    if (!bot || bot.hand.length === 0) {
      await drawCardsLogic(ctx, { roomId, userId: botId, count: 1 });
      return;
    }

    // Exclude immune players from targeting entirely — attacking them
    // is a guaranteed throw in playCardLogic.
    const targets = allPlayers.filter(
      (p) =>
        p.userId !== botId &&
        !p.isEliminated &&
        !p.shieldCards.includes("wild_immunity"),
    );
    const weakestTarget = [...targets].sort((a, b) => a.health - b.health)[0];
    const playable = bot.hand.find((c) => {
      const { category } = parseRoastCard(c);
      return category === "burn" || category === "combo";
    });

    try {
      if (playable && weakestTarget) {
        await playCardLogic(ctx, {
          roomId,
          userId: botId,
          cardId: playable,
          targetId: weakestTarget.userId,
        });
      } else {
        await drawCardsLogic(ctx, { roomId, userId: botId, count: 1 });
      }
    } catch (err) {
      // Any unexpected rejection (immunity, bad targeted-card rule, etc.)
      // must never leave the bot stuck on turn — fall back to a draw so
      // the turn always advances no matter what.
      await drawCardsLogic(ctx, { roomId, userId: botId, count: 1 });
    }
  },
});
// ─── Internal helpers (server-only, not exported to the client) ─────────

async function applyDamageResult(
  ctx: MutationCtx,
  actor: PlayerDoc,
  target: PlayerDoc,
  result: DamageResult,
) {
  if (result.shieldCardConsumed) {
    await ctx.db.patch(target._id, {
      shieldCards: target.shieldCards.filter(
        (c) => c !== result.shieldCardConsumed,
      ),
    });
  }

  if (result.reflectedTo === "ACTOR") {
    // wild_reflect currently just negates the hit and burns the reflect
    // charge. If you want it to bounce real damage back at the attacker
    // instead, replace this branch with an actor.health deduction.
    await ctx.db.patch(target._id, {
      shieldCards: target.shieldCards.filter((c) => c !== "wild_reflect"),
    });
    return;
  }

  if (result.reflectedTo === "ACTOR_MINUS_1") {
    const newActorHealth = Math.max(0, actor.health - 1);
    await ctx.db.patch(actor._id, {
      health: newActorHealth,
      isEliminated: isEliminated(newActorHealth),
    });
    return;
  }

  if (result.finalDamage > 0) {
    const newHealth = Math.max(0, target.health - result.finalDamage);
    await ctx.db.patch(target._id, {
      health: newHealth,
      isEliminated: isEliminated(newHealth),
    });
  }
}

async function currentHealths(
  ctx: QueryCtx,
  roomId: Id<"rooms">,
): Promise<Record<string, number>> {
  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  const healths: Record<string, number> = {};
  for (const p of players) healths[p.userId] = p.health;
  return healths;
}

function advanceTurn(
  game: Pick<GameDoc, "currentPlayerIndex" | "playerOrder">,
) {
  const nextIndex = (game.currentPlayerIndex + 1) % game.playerOrder.length;
  return { nextIndex, nextUserId: game.playerOrder[nextIndex] };
}

function computeLeaderId(alivePlayers: PlayerDoc[]): string | null {
  if (alivePlayers.length === 0) return null;
  return alivePlayers.reduce((best, p) => (p.health > best.health ? p : best))
    .userId;
}

function computeLeftNeighbor(
  playerOrder: string[],
  userId: string,
): string | null {
  const idx = playerOrder.indexOf(userId);
  if (idx === -1) return null;
  return playerOrder[(idx + 1) % playerOrder.length];
}
