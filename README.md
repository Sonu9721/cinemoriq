# Cinemoriq

Cinemoriq is an AI Creative Operating System for planning campaigns, directing cinematic production, enforcing brand and rights guardrails, and turning campaign inputs into structured briefs.

Password-protected live application: [Cinemoriq Sites](https://cinemoriq-os.plum-jay-8118.chatgpt.site)

## Current product surface

- Premium command-center application shell
- Seven-step campaign creation workflow
- AI Campaign Workspace with a five-stage production workflow
- Creative concept preview, production log, pause/resume, and brief details
- AI Creative Studio with scene and version selection, a cinematic preview player,
  an interactive timeline, real provider job orchestration, private output storage,
  resumable polling, durable job recovery, output download, and explicit human
  approval states
- Model-aware generation through fal.ai for Veo 3.1, Kling 3 Standard,
  Seedance 2.0, and MiniMax H3
- Secure local image/video/audio uploads, explicit paid-cost confirmation, and
  endpoint-specific duration, resolution, audio, aspect, and reference controls
- Optional MiniMax Direct connection for the legacy Hailuo 02 API model
- Audience, offer, brand, channel, and creative-direction planning
- Rights and human-review confirmations
- On-device draft and generated-campaign persistence
- Responsive desktop, tablet, and mobile experience
- Single-administrator email/password gate with revocable 12-hour sessions,
  CSRF protection, and D1-backed brute-force limits

## Technology

- React 19
- Next.js App Router API surface
- Vinext and Vite
- TypeScript
- Cloudflare Workers runtime
- Cloudflare D1 job records and private R2 video storage
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

## Provider configuration

Real generation is enabled only when the matching server-side secret exists:

- `FAL_KEY` for Veo, Kling, Seedance, and MiniMax H3 through fal.ai
- `MINIMAX_API_KEY` for MiniMax Hailuo 02 Direct

Keys are never sent to the browser. Hailuo consumer-site welcome credits are
separate from MiniMax Open Platform API billing and cannot power this backend.
The Sites project remains publicly reachable at the edge so the custom Cinemoriq
login can load, but every app page, API, upload, and private media response is
blocked until the administrator signs in.

## Administrator access

Access control uses three server-side environment values:

- `CINEMORIQ_ADMIN_EMAIL`
- `CINEMORIQ_ADMIN_PASSWORD_HASH`
- `CINEMORIQ_SESSION_SECRET`

The password itself is never committed or placed in the hosted source. The local
recovery copy lives in ignored file `.env.admin-credentials`. To rotate the
administrator password and invalidate every existing session:

```bash
npm run auth:rotate
```

Then copy the three raw `CINEMORIQ_*` values from ignored file
`.env.admin-hosting-values` into the matching Cinemoriq Sites environment
variables and redeploy. Do not copy the escaped local hash from `.env.local`.
Use
`npm run auth:rotate -- --email=new-admin@example.com` to change the login email
at the same time. Never use an email-account password as the Cinemoriq password.

Cinemoriq generates a 192-bit random password. Its PBKDF2 work factor is pinned
to Cloudflare Workers' 100,000-iteration runtime ceiling, with D1-backed IP and
account rate limits providing online brute-force protection.

For the recommended production path:

1. Create a key at the official fal.ai dashboard.
2. Add it to the Cinemoriq Sites production environment as the secret `FAL_KEY`.
3. Deploy the current saved version again so the new environment revision applies.
4. Refresh `/settings`; it should report that the server secret is detected.
5. Open Studio, choose a fal.ai model, upload any required references, review the
   explicit cost ceiling, and submit the generation.

Local input files are transferred directly to a narrowly scoped fal.ai signed
upload URL, so the server key never reaches the browser. fal CDN input copies are
public to anyone who knows their unguessable URL and expire after 24 hours.
Successful provider outputs are copied into Cinemoriq's private R2 bucket before
review and download.

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

Campaign drafts, workspace records, and editable Studio scene sessions still persist in the active browser. Paid generation jobs, provider request state, completed video files, and reviews for real outputs persist durably in D1/R2. Cinemoriq does not yet publish campaigns, buy media, or export a final campaign package. Provider renders remain disabled until the corresponding hosted secret is configured, and every completed scene stays in human review until explicitly approved.

## Routes

- `/` — Command Center
- `/login` — Secure administrator sign in
- `/campaigns/new` — Campaign Creation
- `/campaigns/workspace` — AI Campaign Workspace
- `/studio` — AI Creative Studio (open from a specific campaign workspace)
- `/settings` — Secure provider connection status

Copyright © 2026 Cinemoriq. All rights reserved.
