"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { about } from "@/lib/data";

export default function About() {
  return (
    <section id="about" className="scroll-mt-24 py-24">
      <div className="container-page">
        <Reveal>
          <p className="section-eyebrow">About</p>
          <h2 className="section-title">Who I am</h2>
        </Reveal>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <Reveal delay={0.1}>
            <p className="whitespace-pre-line text-lg leading-relaxed text-slate-300">
              {about.bio}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Core Skills
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {about.skills.map((skill, i) => (
                  <motion.div
                    key={skill}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="card flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-accent/50"
                  >
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                    {skill}
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
