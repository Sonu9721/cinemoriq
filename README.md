# Cinemoriq

Cinemoriq is an AI Creative Operating System for planning campaigns, directing cinematic production, enforcing brand and rights guardrails, and turning campaign inputs into structured briefs.

Live application: [cinemoriq.cinemoriq.workers.dev](https://cinemoriq.cinemoriq.workers.dev)

## Current product surface

- Premium command-center application shell
- Seven-step campaign creation workflow
- AI Campaign Workspace with a five-stage production workflow
- Creative concept preview, production log, pause/resume, and brief details
- AI Creative Studio with scene and version selection, a cinematic preview player,
  an interactive timeline, local generation-state simulation, and explicit human
  approval states
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

Campaign drafts, workspace records, and Studio sessions currently persist in the active browser only. The Phase 4 and Phase 5 workflows are honest, deterministic orchestration previews: Cinemoriq does not yet publish campaigns, buy media, export video, or run Kling, Veo, Seedance, or another remote AI-generation backend. Studio model choices are local presets, generated variants are simulated workflow states, and every scene version requires explicit human review before release.

## Routes

- `/` — Command Center
- `/campaigns/new` — Campaign Creation
- `/campaigns/workspace` — AI Campaign Workspace
- `/studio` — AI Creative Studio (open from a specific campaign workspace)

Copyright © 2026 Cinemoriq. All rights reserved.
