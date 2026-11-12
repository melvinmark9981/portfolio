"use client";

import { useEffect } from "react";
import { SR_BOT_PATTERN, SR_STORAGE_KEY } from "@/lib/swarm-rebuild-boot";

/**
 * Swarm Rebuild: a crew of cursor agents scans the page, hides every layer, then rebuilds
 * it as the visitor scrolls (boxes framed and filled, text typed in). Afterwards the agents
 * stay and follow the mouse.
 *
 * ── One flag to turn it off ──────────────────────────────────────────────────
 * Set SWARM_REBUILD_ENABLED to false and nothing runs and nothing is loaded.
 * (The earlier arrow-cursor effect still lives in components/SwarmCursor.tsx, unmounted,
 * as a fallback: swap <SwarmRebuild /> for <SwarmCursor /> in app/page.tsx.)
 *
 * Recruiter safety:
 *  - The server-rendered HTML is untouched: all content is present and visible there and
 *    with JavaScript disabled.
 *  - The full scan/build plays only on the first visit of a browser session. Later visits
 *    show the page immediately with just the cursor agents.
 *  - A visible Skip button (and Esc) ends it at any point; an 8s watchdog ends a stuck scan.
 *  - If anything throws, the effect removes itself and the page is shown normally.
 *  - Nothing the effect draws ever intercepts clicks (only the small Skip toolbar does).
 *  - Off entirely for: reduced motion, touch devices, bots/automation, and ?sr=off.
 *    (?sr=force runs the full entrance regardless; handy for testing.)
 */
export const SWARM_REBUILD_ENABLED = true;

// Tuning
const AGENTS = 14; // capped at 8 on windows narrower than 640px
const SPEED = 2; // 1, 2 or 4. The entrance runs at 2x so a first visit stays snappy.
const BUILD_LINE = 0.88; // fraction of the viewport height where layers get built
const SCAN_BG = "#0A0F1E"; // site background (`ink` in tailwind.config.ts)
const ACCENT = "#4F8CFF"; // site accent

const BOT_RE = new RegExp(SR_BOT_PATTERN, "i");
const STRAY_IDS = ["sr-style", "sr-root", "sr-agents", "sr-scan", "sr-hud"];

type Handle = { destroy: () => void };

export default function SwarmRebuild() {
  useEffect(() => {
    const html = document.documentElement;
    const clearBoot = () => html.classList.remove("sr-boot");
    // Remove anything the engine may have left behind if it failed while starting up.
    const clearStray = () => {
      clearBoot();
      html.classList.remove("sr-lock");
      STRAY_IDS.forEach((id) => document.getElementById(id)?.remove());
    };

    if (!SWARM_REBUILD_ENABLED) {
      clearBoot();
      return;
    }

    let cancelled = false;
    let handle: Handle | null = null;

    try {
      const q = new URLSearchParams(window.location.search).get("sr");
      const force = q === "force";
      const mm = (query: string) => window.matchMedia(query).matches;

      const ineligible =
        q === "off" ||
        mm("(prefers-reduced-motion: reduce)") ||
        mm("(hover: none), (pointer: coarse)") ||
        (!force && (navigator.webdriver || BOT_RE.test(navigator.userAgent)));
      if (ineligible) {
        clearBoot();
        return;
      }

      // Has the entrance already played in this browser session?
      let played = false;
      let storageOk = true;
      try {
        played = window.sessionStorage.getItem(SR_STORAGE_KEY) === "1";
      } catch {
        storageOk = false; // storage blocked: we can't remember a visit, so never replay the entrance
      }
      const mode = force || (storageOk && !played) ? "full" : "agents";

      import("@/lib/swarm-rebuild-engine")
        .then(({ startSwarmRebuild }) => {
          if (cancelled) {
            clearBoot();
            return;
          }
          try {
            handle = startSwarmRebuild({
              mode,
              agents: AGENTS,
              speed: SPEED,
              line: BUILD_LINE,
              bg: SCAN_BG,
              accent: ACCENT,
              onFinish: (reason: string) => {
                if (reason === "done" || reason === "skipped" || reason === "error") {
                  try {
                    window.sessionStorage.setItem(SR_STORAGE_KEY, "1");
                  } catch {
                    /* ignore */
                  }
                }
              },
            });
          } catch {
            clearStray();
          }
        })
        .catch(clearStray);
    } catch {
      clearStray();
    }

    return () => {
      cancelled = true;
      try {
        handle?.destroy();
      } catch {
        /* ignore */
      }
      clearBoot();
    };
  }, []);

  return null;
}
