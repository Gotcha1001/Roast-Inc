"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const FEATURES = [
  {
    title: "Live Roast Battles",
    description:
      "Trade burns with friends in real-time multiplayer matches powered by Convex. Lag is someone else's problem.",
    icon: "💥",
  },
  {
    title: "Private Roast Rooms",
    description:
      "Create a room, invite your most ruthless friends, or join any open lobby. Add bot roasters while you wait.",
    icon: "🎙️",
  },
  {
    title: "Health & Elimination",
    description:
      "Every burn does damage, every shield blocks it. Health hits zero, you're out. Last roaster standing wins.",
    icon: "❤️‍🔥",
  },
];

// Mirrors the five real card categories in lib/roastRules.ts — keep colors
// and emojis in sync with CATEGORY_STYLES in components/RoastCard.tsx.
const DEMO_CARDS = [
  {
    color: "bg-red-600",
    value: "🔥",
    label: "BURN",
    rotate: -18,
    x: -110,
    y: 10,
  },
  {
    color: "bg-blue-600",
    value: "🛡️",
    label: "SHIELD",
    rotate: -6,
    x: -55,
    y: -12,
  },
  {
    color: "bg-orange-500",
    value: "🎤",
    label: "COMBO",
    rotate: 4,
    x: 0,
    y: 4,
  },
  {
    color: "bg-purple-600",
    value: "🎯",
    label: "TARGET",
    rotate: 14,
    x: 55,
    y: -8,
  },
  {
    color: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500",
    value: "✨",
    label: "WILD",
    rotate: 24,
    x: 110,
    y: 10,
  },
];

export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) router.prefetch("/lobby");
  }, [isSignedIn, router]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-white dark:bg-gray-950">
      <div className="hidden dark:block absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[-250px] left-[-250px] w-[700px] h-[700px] rounded-full bg-red-900 opacity-30"
          animate={{ scale: [1, 1.3, 1], x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 25, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute bottom-[-300px] right-[-300px] w-[800px] h-[800px] rounded-full bg-orange-950 opacity-20"
          animate={{ scale: [1, 1.25, 1], x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 30, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      <div className="relative h-52 w-full max-w-sm mb-10">
        {DEMO_CARDS.map((card, i) => (
          <motion.div
            key={i}
            className={`absolute w-16 h-24 rounded-2xl ${card.color} shadow-xl border-2 border-white/30 flex flex-col items-center justify-center gap-1`}
            style={{
              left: "50%",
              top: "50%",
              marginLeft: card.x - 32,
              marginTop: card.y - 48,
              rotate: card.rotate,
              zIndex: i,
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 3,
              delay: i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <span className="text-2xl">{card.value}</span>
            <span className="text-white text-[8px] font-black tracking-widest">
              {card.label}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.h1
        className="text-5xl md:text-7xl font-black text-black dark:text-white tracking-tight relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <span className="text-red-500">ROAST</span>
      </motion.h1>

      <motion.p
        className="mt-5 text-gray-600 dark:text-gray-300 text-lg max-w-xl relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
      >
        Multiplayer roast battle card game. Talk trash, deal damage, don&apos;t
        get roasted out.
      </motion.p>

      <motion.div
        className="mt-8 flex flex-wrap gap-4 justify-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
      >
        {isSignedIn ? (
          <Button
            size="lg"
            className="text-lg px-10 py-6 bg-red-600 hover:bg-red-500 text-white shadow-lg"
            onClick={() => router.push("/lobby")}
          >
            Enter the Roast →
          </Button>
        ) : (
          <>
            <SignInButton mode="modal" forceRedirectUrl="/lobby">
              <Button
                size="lg"
                className="text-lg px-10 py-6 bg-red-600 hover:bg-red-500 text-white shadow-lg"
              >
                Sign In to Start Roasting
              </Button>
            </SignInButton>
            <Link href="/sign-up">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-10 py-6 border-orange-500 text-orange-600 dark:text-orange-400"
              >
                Create Account
              </Button>
            </Link>
          </>
        )}
      </motion.div>

      <motion.div
        className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.2 } },
        }}
      >
        {FEATURES.map((feature, index) => (
          <motion.div
            key={index}
            className="p-6 rounded-2xl border border-red-200 dark:border-orange-900/30 bg-white/70 dark:bg-gray-900/50 shadow-lg backdrop-blur-sm text-left"
            variants={{
              hidden: { opacity: 0, y: 40 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-4xl mb-3">{feature.icon}</div>
            <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-orange-300">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-20 mb-12 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl font-bold mb-4 text-black dark:text-white">
          Ready to Talk Some Trash?
        </h2>
        <Link href={isSignedIn ? "/lobby" : "/sign-up"}>
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-500 text-white px-12 py-6 text-lg shadow-xl"
          >
            Start Roasting →
          </Button>
        </Link>
      </motion.div>
    </main>
  );
}
