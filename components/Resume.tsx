"use client";

import { Download, GraduationCap } from "lucide-react";
import Reveal from "./Reveal";
import { education, profile } from "@/lib/data";

export default function Resume() {
  return (
    <section id="resume" className="scroll-mt-24 py-24">
      <div className="container-page">
        <Reveal>
          <p className="section-eyebrow">Resume</p>
          <h2 className="section-title">Education &amp; Experience</h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 card overflow-hidden">
            <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-navy-600/70 text-accent">
                  <GraduationCap size={24} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">{education.degree}</h3>
                  <p className="text-navy-200">{education.school}</p>
                  <p className="mt-1 text-sm text-slate-400">{education.period}</p>
                </div>
              </div>

              <a
                href={profile.resume}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-navy-600 px-6 py-3 font-semibold text-white transition-all hover:bg-navy-500 hover:shadow-glow"
              >
                <Download size={18} />
                Download Resume (PDF)
              </a>
            </div>

            <div className="border-t border-ink-border px-8 py-6">
              <p className="leading-relaxed text-slate-300">{education.summary}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
