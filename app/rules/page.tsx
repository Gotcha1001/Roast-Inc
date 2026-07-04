import HowToPlayContent from "../components/Howtoplaycontent";

export const metadata = {
  title: "How to Play | Roast",
  description: "Rules and card reference for Roast.",
};

export default function RulesPage() {
  return (
    <div className="flex justify-center py-6">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden px-7 pt-8 pb-7"
        style={{
          background:
            "linear-gradient(160deg, rgba(20,8,8,0.98) 0%, rgba(12,6,6,0.99) 60%, rgba(8,3,3,1) 100%)",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.45), 0 0 60px rgba(239,68,68,0.06)",
        }}
      >
        <div className="mb-1">
          <p className="text-2xl font-black text-white">
            How to <span className="text-red-500">Play</span>
          </p>
          <p className="text-white/40 text-xs mt-1">
            Bookmark this page — share it with new roasters before they join a
            game.
          </p>
        </div>
        <div className="mt-6">
          {/* No onFinish: this is a standalone page, not a flow with a "done"
              state — visitors just navigate away normally (back button, nav,
              sidebar) when they're finished reading. */}
          <HowToPlayContent />
        </div>
      </div>
    </div>
  );
}
