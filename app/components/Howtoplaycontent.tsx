"use client";

import { useState } from "react";
import {
  Search,
  Flame,
  Trophy,
  Shield,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STARTING_HEALTH } from "@/lib/roastRules";

// ─── Card category reference — kept in sync with CATEGORY_STYLES in
//     components/RoastCard.tsx ─────────────────────────────────────────────
const CATEGORIES = [
  {
    emoji: "🔥",
    label: "BURN",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.5)",
    blurb: "Straightforward damage. Cheap and quick — your bread and butter.",
  },
  {
    emoji: "🛡️",
    label: "SHIELD",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.5)",
    blurb:
      "Equip on yourself, no target needed. Blocks, reduces, or bounces back incoming burns.",
  },
  {
    emoji: "🎤",
    label: "COMBO",
    color: "#f97316",
    glow: "rgba(249,115,22,0.5)",
    blurb:
      "Bigger damage — but only if you bring a real, specific detail about your target.",
  },
  {
    emoji: "🎯",
    label: "TARGET",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.5)",
    blurb:
      "Restricted aim: dogpile the leader, pay back your last attacker, or burn your left neighbor.",
  },
  {
    emoji: "✨",
    label: "WILD",
    color: "#eab308",
    glow: "rgba(234,179,8,0.5)",
    blurb: "Rare, game-swinging effects. Save these for when it matters.",
  },
];

export const STEPS = [
  {
    key: "intro",
    title: "Welcome to the Roast",
    icon: Flame,
    accent: "#ef4444",
  },
  {
    key: "cards",
    title: "Five Kinds of Burns",
    icon: Search,
    accent: "#f97316",
  },
  {
    key: "health",
    title: "Health & Shields",
    icon: Shield,
    accent: "#3b82f6",
  },
  {
    key: "winning",
    title: "Last One Standing",
    icon: Trophy,
    accent: "#a855f7",
  },
];

interface HowToPlayContentProps {
  /** Called after the last step's CTA or "Skip" is clicked. Omit to hide both (e.g. on a standalone page with no "done" state). */
  onFinish?: () => void;
  /** Label for the final-step CTA button. */
  finishLabel?: string;
  /** Show the "Skip" link in the footer nav. Defaults to true. */
  showSkip?: boolean;
}

/**
 * Shared rules content + step navigation, used by both:
 *  - HowToPlayModal.tsx (wraps this in an overlay, auto-opens on first visit)
 *  - app/rules/page.tsx (renders this inline as a standalone page)
 *
 * Keeping the actual rules copy in exactly one place so the modal and the
 * page can never drift out of sync with each other.
 */
export default function HowToPlayContent({
  onFinish,
  finishLabel = "Let's Start Roasting →",
  showSkip = true,
}: HowToPlayContentProps) {
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="relative">
      {/* Ambient glow tied to current step's accent */}
      <div
        key={current.accent}
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${current.accent}, transparent)`,
          opacity: 0.12,
        }}
      />

      {/* Step progress dots */}
      <div className="relative z-10 flex items-center gap-1.5 mb-5">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === step ? 28 : 14,
              background: i <= step ? current.accent : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-[340px] flex flex-col">
        <div
          key={step}
          className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-200"
        >
          {step === 0 && <IntroStep />}
          {step === 1 && <CardsStep />}
          {step === 2 && <HealthStep />}
          {step === 3 && <WinningStep />}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white/70 transition-all ${
              step === 0 ? "opacity-0 pointer-events-none" : ""
            }`}
          >
            <ArrowLeft size={13} /> Back
          </button>
          {showSkip && onFinish && (
            <button
              onClick={onFinish}
              className="text-xs text-white/30 hover:text-white/50 transition-all"
            >
              Skip
            </button>
          )}
          {!isLast && (
            <Button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-6"
              style={{ background: current.accent, color: "white" }}
            >
              Next <ArrowRight size={14} className="ml-1.5" />
            </Button>
          )}
          {isLast && onFinish && (
            <Button
              onClick={onFinish}
              className="bg-red-600 hover:bg-red-500 text-white px-6"
            >
              {finishLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step content components ────────────────────────────────────────────────

function StepHeader({
  icon: Icon,
  title,
  accent,
}: {
  icon: typeof Flame;
  title: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}25`, border: `1px solid ${accent}50` }}
      >
        <Icon size={20} style={{ color: accent }} />
      </div>
      <h2 className="text-xl font-black text-white leading-tight">{title}</h2>
    </div>
  );
}

function IntroStep() {
  return (
    <>
      <StepHeader icon={Flame} title="Welcome to the Roast" accent="#ef4444" />
      <p className="text-white/70 text-sm leading-relaxed mb-4">
        You&apos;re at the table to{" "}
        <span className="text-white font-semibold">roast</span> — and to survive
        being roasted. Every turn you play a card that burns an opponent,
        defends you, or twists the odds, until only one person is still
        standing.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="p-3 rounded-2xl border border-white/10 bg-white/5">
          <div className="text-2xl mb-1">🃏</div>
          <p className="text-white text-xs font-bold">Play cards</p>
          <p className="text-white/40 text-[11px] mt-0.5">
            on your turn to deal damage
          </p>
        </div>
        <div className="p-3 rounded-2xl border border-white/10 bg-white/5">
          <div className="text-2xl mb-1">❤️</div>
          <p className="text-white text-xs font-bold">Watch your HP</p>
          <p className="text-white/40 text-[11px] mt-0.5">
            hit zero and you&apos;re roasted out
          </p>
        </div>
      </div>
      <p className="text-white/40 text-xs mt-4 italic">
        Takes about a minute to learn. Let&apos;s go.
      </p>
    </>
  );
}

function CardsStep() {
  return (
    <>
      <StepHeader icon={Search} title="Five Kinds of Burns" accent="#f97316" />
      <p className="text-white/60 text-sm mb-4 leading-relaxed">
        Every card in your hand belongs to one of five categories. Color tells
        you which.
      </p>
      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.label}
            className="flex items-center gap-3 p-2.5 rounded-xl border border-white/10"
            style={{ background: `${cat.color}10` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: cat.color,
                boxShadow: `0 0 14px ${cat.glow}`,
              }}
            >
              {cat.emoji}
            </div>
            <div className="min-w-0">
              <p
                className="text-[11px] font-black tracking-wide"
                style={{ color: cat.color }}
              >
                {cat.label}
              </p>
              <p className="text-white/60 text-xs leading-snug">{cat.blurb}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-[11px] mt-3">
        💡 Hover any card in your hand during a game to see exactly what it does
        and how much damage it deals.
      </p>
    </>
  );
}

function HealthStep() {
  return (
    <>
      <StepHeader icon={Shield} title="Health & Shields" accent="#3b82f6" />
      <p className="text-white/70 text-sm leading-relaxed mb-4">
        Everyone starts at{" "}
        <span className="text-white font-semibold">{STARTING_HEALTH} HP</span>.
        Burn, Combo, and Target cards chip away at it — Shield cards are how you
        stop the bleeding.
      </p>
      <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-950/20 mb-3">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-white/50">Example: 6 HP left</span>
          <span className="text-red-400 font-bold">
            6 / {STARTING_HEALTH} ❤️
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-400"
            style={{ width: `${(6 / STARTING_HEALTH) * 100}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-2 text-white/70">
          <span className="text-blue-400 mt-0.5">🛡️</span>
          <span>
            Shield cards sit ready in front of you and trigger automatically
            when you&apos;re hit — no need to react in time.
          </span>
        </li>
        <li className="flex items-start gap-2 text-white/70">
          <span className="text-yellow-400 mt-0.5">⚠</span>
          <span>
            Different shields do different things: some block a hit completely,
            some cut the damage, and some send it right back at the attacker.
          </span>
        </li>
        <li className="flex items-start gap-2 text-white/70">
          <span className="text-red-400 mt-0.5">💀</span>
          <span>
            Hit <span className="text-white font-semibold">0 HP</span> and
            you&apos;re roasted out — out of the game, but still watching the
            carnage.
          </span>
        </li>
      </ul>
    </>
  );
}

function WinningStep() {
  return (
    <>
      <StepHeader icon={Trophy} title="Last One Standing" accent="#a855f7" />
      <div className="flex flex-col gap-3">
        <div className="p-4 rounded-2xl border border-purple-500/25 bg-purple-950/15">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">🏆</span>
            <p className="text-purple-400 font-black text-sm">
              Only One Way to Win
            </p>
          </div>
          <p className="text-white/60 text-xs leading-relaxed">
            The roast keeps going until every player but one has hit{" "}
            <span className="text-white font-semibold">0 HP</span>.
            Whoever&apos;s left standing wins — there&apos;s no separate point
            race, just outlast the table.
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-orange-500/25 bg-orange-950/15">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">🎯</span>
            <p className="text-orange-400 font-black text-sm">
              Pick Your Targets Wisely
            </p>
          </div>
          <p className="text-white/60 text-xs leading-relaxed">
            Gang up on the leader, hold a Shield in reserve, or wait for a Wild
            card to turn the whole table against everyone else at once.
          </p>
        </div>
      </div>
      <p className="text-white/40 text-xs mt-4 italic">
        Aggressive or defensive, both playstyles win — just don&apos;t run out
        of HP first.
      </p>
    </>
  );
}
