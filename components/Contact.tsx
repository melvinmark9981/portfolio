"use client";

import { useState } from "react";
import { Github, Linkedin, Mail, Phone, Send } from "lucide-react";
import Reveal from "./Reveal";
import { profile } from "@/lib/data";

const channels = [
  { icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
  { icon: Phone, label: "Phone", value: profile.phone, href: `tel:${profile.phoneHref}` },
  { icon: Linkedin, label: "LinkedIn", value: "in/melvinmarkmichael", href: profile.linkedin },
  { icon: Github, label: "GitHub", value: "melvinmark9981", href: profile.github },
];

export default function Contact() {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");

  const mailto = () => {
    const subject = encodeURIComponent(`Portfolio enquiry from ${name || "someone"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${from}`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contact" className="scroll-mt-24 py-24">
      <div className="container-page">
        <Reveal>
          <p className="section-eyebrow">Contact</p>
          <h2 className="section-title">Let&apos;s work together</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Open to Professional Attachment opportunities from September 2026, and
            happy to talk about AI, data science, and applied ML.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              {channels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-navy-600/70 text-accent transition-colors group-hover:bg-navy-500">
                    <c.icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{c.label}</p>
                    <p className="truncate text-sm font-medium text-slate-200">{c.value}</p>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mailto();
              }}
              className="card space-y-4 p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-ink-border bg-ink/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-accent"
                />
                <input
                  required
                  type="email"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Your email"
                  className="w-full rounded-lg border border-ink-border bg-ink/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-accent"
                />
              </div>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message"
                className="w-full resize-none rounded-lg border border-ink-border bg-ink/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-accent"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-600 px-6 py-3 font-semibold text-white transition-all hover:bg-navy-500 hover:shadow-glow"
              >
                <Send size={18} />
                Send Message
              </button>
              <p className="text-center text-xs text-slate-500">
                Opens your email client, pre-filled and addressed to me.
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
