# Melvin Mark Michael — Portfolio

A professional personal portfolio built with **Next.js 14 (App Router)**,
**Tailwind CSS**, and **Framer Motion**. Dark navy theme, scroll animations,
fully responsive, and deploy-ready on Vercel.

## Sections

- **Hero** — name, title, tagline, CTAs, animated background, portrait
- **About** — bio + skills grid
- **Projects** — 6 project cards with live GitHub links (featured FYP highlighted)
- **Resume** — education summary + PDF download
- **Contact** — email / phone / LinkedIn / GitHub + mailto contact form

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Add your assets

Place these in `public/` (see `public/README.md`):

- `profile.jpg` — your headshot (falls back to an "MM" monogram if missing)
- `resume.pdf` — your resume

## Edit content

All text, links, projects, and skills live in **`lib/data.ts`** — edit there,
no component changes needed.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Framework preset **Next.js** is auto-detected — click **Deploy**.

## Tech

Next.js 14 · React 18 · Tailwind CSS 3 · Framer Motion 11 · lucide-react · TypeScript
