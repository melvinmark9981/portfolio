"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, MapPin, Sparkles } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import ProfileImage from "./ProfileImage";
import { profile } from "@/lib/data";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen items-center pt-24">
      <AnimatedBackground />
      <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div
            variants={item}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-border bg-ink-card/70 px-4 py-1.5 text-xs font-medium text-slate-300"
          >
            <Sparkles size={14} className="text-accent" />
            {profile.availability}
          </motion.div>

          <motion.h1
            variants={item}
            className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl"
          >
            {profile.name}
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-4 bg-gradient-to-r from-accent to-navy-300 bg-clip-text text-lg font-semibold text-transparent sm:text-2xl"
          >
            {profile.title}
          </motion.p>

          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            {profile.tagline}
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-4">
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 rounded-xl bg-navy-600 px-6 py-3 font-semibold text-white transition-all hover:bg-navy-500 hover:shadow-glow"
            >
              View Projects
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={profile.resume}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-ink-border bg-ink-card/60 px-6 py-3 font-semibold text-white transition-all hover:border-accent/60 hover:bg-ink-card"
            >
              <Download size={18} />
              Download Resume
            </a>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex items-center gap-2 text-sm text-slate-400"
          >
            <MapPin size={16} className="text-accent" />
            {profile.location}
          </motion.div>
        </motion.div>

        {/* Portrait */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-navy-600/40 to-accent/30 blur-2xl" />
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-ink-border bg-ink-card shadow-glow ring-1 ring-white/5 animate-float">
            <ProfileImage />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
