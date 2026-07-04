"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useSyncExternalStore, useCallback } from "react";
import { X } from "lucide-react";
import HowToPlayContent from "./Howtoplaycontent";

// ─── localStorage key — bump the version suffix if you change the content
//     substantially and want returning players to see it again ──────────────
const SEEN_KEY = "roast-game-howtoplay-seen-v1";

// ─── Reading "has this player seen the rules" via useSyncExternalStore ─────
// This is the hook React provides specifically for subscribing to a value
// that lives outside React (localStorage qualifies) and that can legitimately
// differ between server and client. Unlike a plain effect, there's no
// setState call involved at all here — React calls getSnapshot() itself,
// at the right time, and knows to use getServerSnapshot() during SSR/the
// first hydration pass so there's no mismatch to begin with.
function subscribe() {
  // The seen-flag never changes from outside this component while it's
  // mounted (we're the ones writing it, on close), so there's nothing to
  // subscribe to — return a no-op unsubscribe.
  return () => {};
}
function getHasSeenSnapshot() {
  return localStorage.getItem(SEEN_KEY) !== null;
}
function getHasSeenServerSnapshot() {
  // Server has no localStorage — treat as "not seen yet" so the very first
  // markup matches what an actual first-time visitor's client will compute.
  return false;
}

function useHasSeenRules() {
  return useSyncExternalStore(
    subscribe,
    getHasSeenSnapshot,
    getHasSeenServerSnapshot,
  );
}

interface HowToPlayModalProps {
  /** Controlled-open override — if omitted, the modal manages its own first-visit logic */
  open?: boolean;
  onClose?: () => void;
}

export default function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  const hasSeenRules = useHasSeenRules();
  // One piece of local state purely for "the player dismissed it this
  // session" — separate from the localStorage-derived value, so we never
  // need to write into the synced snapshot from inside an effect.
  const [dismissed, setDismissed] = useState(false);

  const isOpen = open ?? (!hasSeenRules && !dismissed);

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined") localStorage.setItem(SEEN_KEY, "1");
    setDismissed(true);
    onClose?.();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, rgba(26,10,14,0.98) 0%, rgba(15,7,10,0.99) 60%, rgba(8,4,6,1) 100%)",
              boxShadow:
                "0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(249,115,22,0.10)",
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close how to play"
            >
              <X size={18} />
            </button>

            <div className="px-7 pt-12 pb-7">
              <HowToPlayContent onFinish={handleClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
