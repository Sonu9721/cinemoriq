# Cinemoriq

Cinemoriq is an AI Creative Operating System for planning campaigns, directing cinematic production, enforcing brand and rights guardrails, and turning campaign inputs into structured briefs.

Live application: [cinemoriq.cinemoriq.workers.dev](https://cinemoriq.cinemoriq.workers.dev)

## Current product surface

- Premium command-center application shell
- Seven-step campaign creation workflow
- AI Campaign Workspace with a five-stage production workflow
- Creative concept preview, production log, pause/resume, and brief details
- Audience, offer, brand, channel, and creative-direction planning
- Rights and human-review confirmations
- On-device draft and generated-campaign persistence
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

The deployment command publishes the canonical Worker at `cinemoriq.cinemoriq.workers.dev` and configures that address as the metadata origin. Update `SITE_ORIGIN` in the deployment command when connecting a custom domain.

For a local Workers-runtime preview:

```bash
npm run preview:cloudflare
```

## Important product status

Campaign drafts and workspace records currently persist in the active browser only. The Phase 4 workflow is an honest, deterministic orchestration preview: Cinemoriq does not yet publish campaigns, buy media, or run Kling, Veo, or another remote AI-generation backend. Every generated brief and creative concept requires human review before release.

## Routes

- `/` — Command Center
- `/campaigns/new` — Campaign Creation
- `/campaigns/workspace` — AI Campaign Workspace

Copyright © 2026 Cinemoriq. All rights reserved.
