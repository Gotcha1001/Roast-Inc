"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface BackgroundOption {
  id: string;
  label: string;
  thumbnail: string; // path in /public
  src: string; // path in /public
  overlay?: string; // optional CSS color overlay e.g. "rgba(0,0,0,0.45)"
}

// ── Add your images to /public/backgrounds/ and list them here ──────────────
export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: "felt",
    label: "Green Felt",
    thumbnail: "",
    src: "",
    overlay: undefined,
  },
  {
    id: "space",
    label: "Deep Space",
    thumbnail: "/backgrounds/space-thumb.jpg",
    src: "/backgrounds/space-thumb.jpg",
    overlay: "rgba(0,0,0,0.35)",
  },
  {
    id: "forest",
    label: "Dark Forest",
    thumbnail: "/backgrounds/forest-thumb.jpg",
    src: "/backgrounds/forest-thumb.jpg",
    overlay: "rgba(0,0,0,0.4)",
  },
  {
    id: "neon",
    label: "Neon City",
    thumbnail: "/backgrounds/neon-thumb.jpg",
    src: "/backgrounds/neon-thumb.jpg",
    overlay: "rgba(0,0,0,0.3)",
  },
  {
    id: "ocean",
    label: "Ocean Depths",
    thumbnail: "/backgrounds/ocean-thumb.jpg",
    src: "/backgrounds/ocean-thumb.jpg",
    overlay: "rgba(0,10,30,0.45)",
  },
  {
    id: "lava",
    label: "Lava Flow",
    thumbnail: "/backgrounds/lava-thumb.jpg",
    src: "/backgrounds/lava-thumb.jpg",
    overlay: "rgba(0,0,0,0.4)",
  },
];

const STORAGE_KEY = "uno-board-bg";
const DEFAULT_ID = "felt";

interface BackgroundContextValue {
  selected: BackgroundOption;
  setBackground: (id: string) => void;
}

const BackgroundContext = createContext<BackgroundContextValue>({
  selected: BACKGROUNDS[0],
  setBackground: () => {},
});

export function BackgroundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    // Only runs on the client, once, at mount time
    if (typeof window === "undefined") return DEFAULT_ID;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && BACKGROUNDS.find((b) => b.id === saved)) return saved;
    return DEFAULT_ID;
  });

  const setBackground = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const selected =
    BACKGROUNDS.find((b) => b.id === selectedId) ?? BACKGROUNDS[0];

  return (
    <BackgroundContext.Provider value={{ selected, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export const useBackground = () => useContext(BackgroundContext);

// "use client";

// import { createContext, useContext, useState } from "react";

// export interface BackgroundOption {
//   id: string;
//   label: string;
//   thumbnail: string;
//   src: string;
//   overlay?: string;
// }

// export const BACKGROUNDS: BackgroundOption[] = [
//   { id: "office_dark", label: "Dark Office",  thumbnail: "", src: "", overlay: "radial-gradient(ellipse at 50% 40%, #0a1a10 0%, #060f09 60%, #030805 100%)" },
//   { id: "chaos_red",   label: "Chaos Red",    thumbnail: "", src: "", overlay: "radial-gradient(ellipse at 50% 40%, #1a0505 0%, #0f0303 60%, #080101 100%)" },
//   { id: "server_room", label: "Server Room",  thumbnail: "", src: "", overlay: "radial-gradient(ellipse at 50% 40%, #050a1a 0%, #030610 60%, #010308 100%)" },
//   { id: "ceo_office",  label: "CEO Office",   thumbnail: "", src: "", overlay: "radial-gradient(ellipse at 50% 40%, #1a1005 0%, #0f0a03 60%, #080601 100%)" },
// ];

// function getInitialId(): string {
//   if (typeof window === "undefined") return "office_dark";
//   const saved = localStorage.getItem("gremlin-bg");
//   return saved && BACKGROUNDS.find((b) => b.id === saved) ? saved : "office_dark";
// }

// const BackgroundContext = createContext<{ selected: BackgroundOption; setBackground: (id: string) => void }>({
//   selected: BACKGROUNDS[0],
//   setBackground: () => {},
// });

// export function useBackground() { return useContext(BackgroundContext); }

// export function BackgroundProvider({ children }: { children: React.ReactNode }) {
//   const [selectedId, setSelectedId] = useState<string>(getInitialId);

//   const setBackground = (id: string) => {
//     setSelectedId(id);
//     localStorage.setItem("gremlin-bg", id);
//   };

//   const selected = BACKGROUNDS.find((b) => b.id === selectedId) ?? BACKGROUNDS[0];

//   return (
//     <BackgroundContext.Provider value={{ selected, setBackground }}>
//       {children}
//     </BackgroundContext.Provider>
//   );
// }