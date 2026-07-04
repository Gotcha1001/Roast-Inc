"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CARD_NAMES, parseRoastCard, requiresTarget } from "@/lib/roastRules";

const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;
    glow: string;
    glowColor: string;
    innerBorder: string;
    label: string;
  }
> = {
  burn: {
    bg: "radial-gradient(ellipse at 38% 32%, #fca5a5 0%, #ef4444 28%, #dc2626 55%, #991b1b 80%, #450a0a 100%)",
    glow: "rgba(239,68,68,0.8)",
    glowColor: "#ef4444",
    innerBorder: "rgba(254,202,202,0.35)",
    label: "BURN",
  },
  shield: {
    bg: "radial-gradient(ellipse at 38% 32%, #bfdbfe 0%, #3b82f6 28%, #2563eb 55%, #1e40af 80%, #172554 100%)",
    glow: "rgba(59,130,246,0.75)",
    glowColor: "#3b82f6",
    innerBorder: "rgba(191,219,254,0.35)",
    label: "SHIELD",
  },
  combo: {
    bg: "radial-gradient(ellipse at 38% 32%, #fdba74 0%, #f97316 28%, #c2410c 55%, #7c2d12 80%, #2f0e03 100%)",
    glow: "rgba(249,115,22,0.8)",
    glowColor: "#f97316",
    innerBorder: "rgba(254,215,170,0.35)",
    label: "COMBO",
  },
  target: {
    bg: "radial-gradient(ellipse at 38% 32%, #d8b4fe 0%, #a855f7 28%, #7e22ce 55%, #4c1d95 80%, #1e1033 100%)",
    glow: "rgba(168,85,247,0.75)",
    glowColor: "#a855f7",
    innerBorder: "rgba(233,213,255,0.35)",
    label: "TARGETED",
  },
  wild: {
    bg: "radial-gradient(ellipse at 38% 32%, #fef08a 0%, #facc15 28%, #a16207 55%, #713f12 80%, #1e1b4b 100%)",
    glow: "rgba(234,179,8,0.8)",
    glowColor: "#eab308",
    innerBorder: "rgba(254,249,195,0.4)",
    label: "WILD",
  },
};

const SIZE_CLASSES = {
  sm: {
    outer: "w-10 h-[3.5rem]",
    corner: "text-[0.4rem]",
    center: "1.1rem",
    radius: "rounded-xl",
  },
  md: {
    outer: "w-[4.2rem] h-[6rem]",
    corner: "text-[0.55rem]",
    center: "1.6rem",
    radius: "rounded-2xl",
  },
  lg: {
    outer: "w-[5.2rem] h-[7.4rem]",
    corner: "text-[0.65rem]",
    center: "2rem",
    radius: "rounded-2xl",
  },
};

interface RoastCardProps {
  cardId: string;
  size?: "sm" | "md" | "lg";
  isPlayable?: boolean;
  isSelected?: boolean;
  isFaceDown?: boolean;
  onClick?: () => void;
  onDragStart?: (cardId: string) => void;
  className?: string;
  style?: React.CSSProperties;
  index?: number;
}

const TOOLTIP_WIDTH = 176; // matches w-44 (44 * 4px)
const TOOLTIP_GAP = 10;

export function RoastCard({
  cardId,
  size = "md",
  isPlayable = false,
  isSelected = false,
  isFaceDown = false,
  onClick,
  onDragStart,
  className,
  style,
  index = 0,
}: RoastCardProps) {
  const { category } = parseRoastCard(cardId);
  const cs = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.wild;
  const s = SIZE_CLASSES[size];
  const meta = CARD_NAMES[cardId];
  const displayName = meta?.name ?? cardId.replace(/_/g, " ");
  const description = meta?.description;
  const damage = meta?.damage ?? 0;
  const needsTarget = requiresTarget(cardId);

  const [hovered, setHovered] = useState(false);

  // Tooltip is portaled to document.body so it can't be clipped by an
  // ancestor's overflow (e.g. the hand's overflow-y-auto scroll area).
  // Since it's no longer a descendant of the card's `relative` wrapper,
  // it can't use percentage/bottom-[...] positioning — we measure the
  // card's real screen position and place the tooltip with fixed pixels.
  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updateTooltipPos = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const clampedLeft = Math.min(
      Math.max(centerX, TOOLTIP_WIDTH / 2 + 8),
      window.innerWidth - TOOLTIP_WIDTH / 2 - 8,
    );
    setTooltipPos({ top: rect.top - TOOLTIP_GAP, left: clampedLeft });
  }, []);

  useEffect(() => {
    if (!hovered) return;
    updateTooltipPos();
    window.addEventListener("scroll", updateTooltipPos, true);
    window.addEventListener("resize", updateTooltipPos);
    return () => {
      window.removeEventListener("scroll", updateTooltipPos, true);
      window.removeEventListener("resize", updateTooltipPos);
    };
  }, [hovered, updateTooltipPos]);

  const showTooltip =
    hovered && !isFaceDown && description && size !== "sm" && tooltipPos;

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                className="fixed z-[200] pointer-events-none"
                style={{
                  top: tooltipPos.top,
                  left: tooltipPos.left,
                  transform: "translate(-50%, -100%)",
                }}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  className="w-44 rounded-xl px-3 py-2.5 shadow-2xl border border-white/20"
                  style={{
                    background: "rgba(10,10,20,0.97)",
                    backdropFilter: "blur(12px)",
                    boxShadow: `0 0 0 1px ${cs.glowColor}40, 0 8px 32px rgba(0,0,0,0.8)`,
                  }}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-white font-black text-[11px] leading-tight">
                      {displayName}
                    </span>
                    {damage > 0 && (
                      <span className="text-red-400 font-black text-[11px] leading-tight shrink-0">
                        {damage} DMG
                      </span>
                    )}
                  </div>
                  <div
                    className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold mb-1.5"
                    style={{
                      background: `${cs.glowColor}30`,
                      color: cs.glowColor,
                      border: `1px solid ${cs.glowColor}50`,
                    }}
                  >
                    {cs.label}
                  </div>
                  <p className="text-white/70 text-[10px] leading-relaxed">
                    {description}
                  </p>
                  {needsTarget && (
                    <p className="text-white/40 text-[9px] font-bold mt-1.5">
                      🎯 pick a target
                    </p>
                  )}
                  {!isPlayable && (
                    <p className="text-red-400 text-[9px] font-bold mt-1.5">
                      🚫 can&apos;t play this now
                    </p>
                  )}
                </div>
                <div
                  className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-3 h-3 rotate-45 border-r border-b border-white/20"
                  style={{ background: "rgba(10,10,20,0.97)" }}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <motion.div
        ref={cardRef}
        className={cn(
          "relative select-none",
          s.outer,
          s.radius,
          onClick && isPlayable ? "cursor-pointer" : "cursor-default",
          className,
        )}
        draggable={isPlayable}
        onDragStart={() => onDragStart?.(cardId)}
        style={{
          ...style,
          boxShadow: isSelected
            ? `0 0 0 3px white, 0 0 0 5px ${cs.glowColor}, 0 0 36px ${cs.glow}, 0 14px 32px rgba(0,0,0,0.55)`
            : isPlayable
              ? `0 0 0 2px rgba(255,255,255,0.15), 0 0 22px ${cs.glow}, 0 6px 18px rgba(0,0,0,0.5)`
              : "0 4px 14px rgba(0,0,0,0.45)",
        }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.04,
          type: "spring",
          stiffness: 300,
          damping: 22,
        }}
        whileHover={
          isPlayable ? { y: -16, scale: 1.12 } : { y: -4, scale: 1.04 }
        }
        whileTap={isPlayable ? { scale: 0.92 } : undefined}
        onClick={isPlayable ? onClick : undefined}
      >
        <div
          className={cn("absolute inset-0 overflow-hidden", s.radius)}
          style={{
            background: isFaceDown
              ? "radial-gradient(ellipse at 38% 32%, #f87171 0%, #7f1d1d 35%, #2e0a0a 65%, #0a0202 100%)"
              : cs.bg,
          }}
        >
          {/* Specular highlight, simulates a light source top-left */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 22% 18%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 35%, transparent 60%)",
            }}
          />
          {/* Inset border ring */}
          <div
            className={cn(
              "absolute inset-[3px] pointer-events-none border",
              s.radius,
            )}
            style={{ borderColor: cs.innerBorder, borderWidth: "1.5px" }}
          />

          {!isFaceDown ? (
            <>
              {/* Damage badge, top-left corner */}
              {damage > 0 && (
                <span
                  className={cn(
                    "absolute top-1.5 left-2 font-black text-white leading-none",
                    s.corner,
                  )}
                  style={{
                    textShadow:
                      "0 1px 4px rgba(0,0,0,0.65), 0 0 10px rgba(255,255,255,0.2)",
                  }}
                >
                  {damage}
                </span>
              )}
              {/* Card emoji, bottom-right corner, rotated like a suit index */}
              <span
                className={cn(
                  "absolute bottom-1.5 right-2 leading-none rotate-180",
                  s.corner,
                )}
              >
                {meta?.emoji ?? ""}
              </span>

              {/* Center content: name (large sizes) or bare emoji (small) */}
              <div
                className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center text-center px-1.5"
                style={{ transform: "translate(-50%, -50%)", width: "88%" }}
              >
                {size !== "sm" ? (
                  <span
                    className="font-black text-white leading-tight"
                    style={{
                      fontSize: size === "lg" ? "0.62rem" : "0.55rem",
                      textShadow:
                        "0 2px 8px rgba(0,0,0,0.7), 0 0 18px rgba(255,255,255,0.25)",
                    }}
                  >
                    {displayName}
                  </span>
                ) : (
                  <span
                    className="font-black text-white"
                    style={{ fontSize: s.center }}
                  >
                    {damage > 0 ? damage : "★"}
                  </span>
                )}
              </div>

              {/* Wild cards: slow-spinning conic shimmer, matches GremelinCard's wild treatment */}
              {category === "wild" && (
                <motion.div
                  className={cn(
                    "absolute inset-0 pointer-events-none",
                    s.radius,
                  )}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(250,204,21,0.25), rgba(239,68,68,0.25), rgba(168,85,247,0.25), rgba(59,130,246,0.25), rgba(250,204,21,0.25))",
                    mixBlendMode: "screen",
                  }}
                />
              )}

              {/* Playable pulse */}
              {isPlayable && (
                <motion.div
                  className={cn(
                    "absolute inset-0 pointer-events-none",
                    s.radius,
                  )}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    background: `radial-gradient(ellipse at 50% 50%, ${cs.glow} 0%, transparent 72%)`,
                  }}
                />
              )}
            </>
          ) : (
            <>
              <div
                className="absolute inset-[5px] pointer-events-none"
                style={{
                  borderRadius: "9px",
                  border: "1px solid rgba(248,113,113,0.2)",
                  background:
                    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(239,68,68,0.08) 5px, rgba(239,68,68,0.08) 10px)",
                }}
              />
              <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-white/25 tracking-[0.2em]"
                style={{
                  fontSize:
                    size === "lg"
                      ? "0.65rem"
                      : size === "md"
                        ? "0.5rem"
                        : "0.4rem",
                }}
              >
                ROAST
              </span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function CardBack({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <RoastCard
      cardId="burn_side_eye"
      size={size}
      isFaceDown
      className={className}
    />
  );
}
