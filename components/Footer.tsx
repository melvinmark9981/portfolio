import { Github, Linkedin, Mail } from "lucide-react";
import { profile } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-ink-border py-10">
      <div className="container-page flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {profile.name}. Built with Next.js, Tailwind &amp; Framer Motion.
        </p>
        <div className="flex items-center gap-4">
          <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="text-slate-500 transition-colors hover:text-white">
            <Github size={20} />
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-slate-500 transition-colors hover:text-white">
            <Linkedin size={20} />
          </a>
          <a href={`mailto:${profile.email}`} aria-label="Email" className="text-slate-500 transition-colors hover:text-white">
            <Mail size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
