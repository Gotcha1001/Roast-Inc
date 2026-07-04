"use client";

import { useCallback, useRef } from "react";

// Every case below maps to a file that actually exists in /public/sounds
// (carried over from the original UNO build). None of the Gremlins/Roast
// -named files (card-excuse.mp3, hr-alarm.mp3, chaos-win.mp3, etc.) were
// ever added to the project, so we reuse the real UNO assets by closest
// color/mood match until dedicated roast audio exists.
type SoundName =
  | "cardSabotage" // burn card played      -> red
  | "cardExcuse" // shield card equipped     -> blue
  | "cardTool" // combo card played          -> yellow (closest to combo's orange)
  | "cardWild" // wild / targeted card played -> wild
  | "cardDraw"
  | "cardDeal"
  | "yourTurn"
  | "roastWin"
  | "roastLose"
  | "buttonClick"
  | "roomJoin"
  | "gameStart";

function playFile(src: string, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

export function useSoundManager() {
  const mutedRef = useRef(false);

  const play = useCallback((sound: SoundName) => {
    if (mutedRef.current) return;
    try {
      switch (sound) {
        case "cardSabotage":
          playFile("/sounds/card-play-red.mp3");
          break;
        case "cardExcuse":
          playFile("/sounds/card-play-blue.mp3");
          break;
        case "cardTool":
          playFile("/sounds/card-play-yellow.mp3");
          break;
        case "cardWild":
          playFile("/sounds/card-play-wild.mp3");
          break;
        case "cardDraw":
          playFile("/sounds/card-draw.mp3");
          break;
        case "cardDeal":
          playFile("/sounds/card-deal.mp3", 0.7);
          break;
        case "yourTurn":
          playFile("/sounds/your-turn.mp3");
          break;
        case "roastWin":
          playFile("/sounds/win.mp3");
          break;
        case "roastLose":
          playFile("/sounds/lose.mp3");
          break;
        case "buttonClick":
          playFile("/sounds/button-click.mp3", 0.5);
          break;
        case "roomJoin":
          playFile("/sounds/room-join.mp3");
          break;
        case "gameStart":
          playFile("/sounds/game-start.mp3");
          break;
      }
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
  }, []);
  const isMuted = useCallback(() => mutedRef.current, []);

  return { play, setMuted, isMuted };
}
