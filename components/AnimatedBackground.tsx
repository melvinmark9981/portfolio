"use client";

import { motion } from "framer-motion";

/**
 * Subtle animated hero background: two slow-drifting navy/accent blobs plus a
 * faint grid. Purely decorative and non-interactive.
 */
export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(79,140,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(79,140,255,0.12) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <motion.div
        className="absolute -top-24 left-[-10%] h-[38rem] w-[38rem] rounded-full bg-navy-500/25 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-10 right-[-15%] h-[34rem] w-[34rem] rounded-full bg-accent/15 blur-3xl"
        animate={{ x: [0, -50, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
