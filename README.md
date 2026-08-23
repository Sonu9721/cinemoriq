# Cinemoriq

Cinemoriq is an AI Creative Operating System for planning campaigns, directing cinematic production, enforcing brand and rights guardrails, and turning campaign inputs into structured briefs.

## Current product surface

- Premium command-center application shell
- Seven-step campaign creation workflow
- Audience, offer, brand, channel, and creative-direction planning
- Rights and human-review confirmations
- On-device draft persistence
- Responsive desktop, tablet, and mobile experience

## Technology

- React 19
- Next.js App Router API surface
- Vinext and Vite
- TypeScript
- Cloudflare Workers runtime
- Plus Jakarta Sans and Lucide icons

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run lint
npm run build
```

## Cloudflare deployment

The application is built for the Cloudflare Workers runtime. After authenticating Wrangler:

```bash
npm run deploy:cloudflare
```

For a local Workers-runtime preview:

```bash
npm run preview:cloudflare
```

## Important product status

Campaign drafts currently persist in the active browser only. Cinemoriq does not yet publish campaigns, buy media, or run a remote AI-generation backend. Every generated brief remains a draft and requires human review before release.

## Routes

- `/` — Command Center
- `/campaigns/new` — Campaign Creation

Copyright © 2026 Cinemoriq. All rights reserved.
