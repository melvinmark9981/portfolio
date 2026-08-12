"use client";

import { motion } from "framer-motion";
import { Github, Star } from "lucide-react";
import Reveal from "./Reveal";
import { projects } from "@/lib/data";

export default function Projects() {
  return (
    <section id="projects" className="scroll-mt-24 py-24">
      <div className="container-page">
        <Reveal>
          <p className="section-eyebrow">Portfolio</p>
          <h2 className="section-title">Featured Projects</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Production-ready AI and data-science systems — each with a live GitHub
            repository.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {projects.map((p, i) => (
            <motion.a
              key={p.title}
              href={p.github}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
              className={`group card relative flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-glow ${
                p.featured
                  ? "md:col-span-2 border-accent/40 bg-gradient-to-br from-navy-800/60 to-ink-card"
                  : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    p.featured
                      ? "bg-accent/15 text-accent"
                      : "bg-navy-700/60 text-navy-200"
                  }`}
                >
                  {p.featured && <Star size={12} className="fill-accent" />}
                  {p.tag}
                </span>
                <Github
                  size={20}
                  className="text-slate-500 transition-colors group-hover:text-white"
                />
              </div>

              <h3 className="text-xl font-bold text-white group-hover:text-accent">
                {p.title}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                {p.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {p.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-ink-border bg-ink/60 px-2.5 py-1 text-xs font-medium text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
