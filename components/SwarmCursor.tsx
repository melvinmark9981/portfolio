"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Swarm cursor: a small flock of particles that drifts toward the mouse using
 * boids-style rules (cohesion, alignment, separation) plus a pull to the cursor.
 *
 * ── One flag to turn it off ──────────────────────────────────────────────────
 * Set SWARM_ENABLED to false and the component renders nothing and runs no code.
 */
export const SWARM_ENABLED = true;

const PARTICLE_COUNT = 60; // keep within ~40–80
const ACCENT_RGB = "79, 140, 255"; // site accent (#4f8cff, `accent` in tailwind.config.ts)

// Boids tuning. Speeds are px per frame at 60fps; the step is scaled by real dt.
const PERCEPTION = 70; // neighbour radius for cohesion / alignment
const SEPARATION = 22; // personal-space radius
const MAX_SPEED = 4.2;
const MAX_FORCE = 0.14;
const W_COHESION = 0.55;
const W_ALIGNMENT = 0.85;
const W_SEPARATION = 1.5;
const W_SEEK = 1.0;
const ARRIVE_RADIUS = 110; // particles slow down inside this radius around the cursor
const SWIRL = 0.045; // small sideways push so the swarm circles the cursor

type Particle = { x: number; y: number; vx: number; vy: number };

function limit(x: number, y: number, max: number): [number, number] {
  const m = Math.hypot(x, y);
  return m > max ? [(x / m) * max, (y / m) * max] : [x, y];
}

/** Steering force toward a desired velocity, clamped to MAX_FORCE. */
function steer(dx: number, dy: number, p: Particle): [number, number] {
  const m = Math.hypot(dx, dy);
  if (m === 0) return [0, 0];
  return limit((dx / m) * MAX_SPEED - p.vx, (dy / m) * MAX_SPEED - p.vy, MAX_FORCE);
}

export default function SwarmCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  // Decide whether the effect should run: not on touch devices, not when the
  // user prefers reduced motion. Re-evaluates if either preference changes.
  useEffect(() => {
    if (!SWARM_ENABLED) return;
    const touch = window.matchMedia("(hover: none), (pointer: coarse)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setActive(!touch.matches && !reduced.matches);
    update();
    touch.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      touch.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Start in a loose cluster near the middle of the screen.
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 240,
      y: height / 2 + (Math.random() - 0.5) * 240,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    }));

    // Cursor target. Until the mouse moves (or after it leaves the window) the
    // swarm idles by following a slow wandering point instead.
    let pointer: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      pointer = null;
    };

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min((now - last) / 16.667, 3) : 1; // clamp after stalls
      last = now;

      const target = pointer ?? {
        x: width / 2 + Math.cos(now * 0.0003) * width * 0.28,
        y: height / 2 + Math.sin(now * 0.00041) * height * 0.22,
      };

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const o = particles[j];
          const dx = o.x - p.x;
          const dy = o.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > PERCEPTION * PERCEPTION) continue;
          n++;
          cx += o.x; cy += o.y;
          ax += o.vx; ay += o.vy;
          if (d2 < SEPARATION * SEPARATION && d2 > 0.0001) {
            sx -= dx / d2; // closer neighbours push harder
            sy -= dy / d2;
          }
        }

        let fx = 0, fy = 0;
        if (n > 0) {
          const [cohX, cohY] = steer(cx / n - p.x, cy / n - p.y, p);
          const [aliX, aliY] = steer(ax / n, ay / n, p);
          fx += cohX * W_COHESION + aliX * W_ALIGNMENT;
          fy += cohY * W_COHESION + aliY * W_ALIGNMENT;
        }
        if (sx !== 0 || sy !== 0) {
          const [sepX, sepY] = steer(sx, sy, p);
          fx += sepX * W_SEPARATION;
          fy += sepY * W_SEPARATION;
        }

        // Pull toward the cursor, easing off near it so the swarm hovers rather than collapses.
        const tx = target.x - p.x;
        const ty = target.y - p.y;
        const td = Math.hypot(tx, ty) || 1;
        const arrive = Math.min(td / ARRIVE_RADIUS, 1);
        const [seekX, seekY] = limit(
          (tx / td) * MAX_SPEED * arrive - p.vx,
          (ty / td) * MAX_SPEED * arrive - p.vy,
          MAX_FORCE,
        );
        fx += seekX * W_SEEK;
        fy += seekY * W_SEEK;
        if (td < ARRIVE_RADIUS * 2) {
          fx += (-ty / td) * SWIRL;
          fy += (tx / td) * SWIRL;
        }

        p.vx += fx * dt;
        p.vy += fy * dt;
        [p.vx, p.vy] = limit(p.vx, p.vy, MAX_SPEED);
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Soft walls
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        else if (p.x > width) { p.x = width; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        else if (p.y > height) { p.y = height; p.vy = -Math.abs(p.vy); }
      }

      // Draw: faint motion streaks, then dots. Two batched paths per frame.
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${ACCENT_RGB}, 0.28)`;
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      ctx.fillStyle = `rgba(${ACCENT_RGB}, 0.65)`;
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x + 1.7, p.y);
        ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  if (!SWARM_ENABLED || !active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 h-full w-full select-none"
    />
  );
}
