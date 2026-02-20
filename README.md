# PerfectShape AI Monorepo

This repository scaffolds the core product described in `AGENTS.md`.

## Structure

- `backend`: Firebase Cloud Functions API (TypeScript + Express)
- `web`: Next.js + Tailwind dashboard
- `react-native`: React Native mobile app
- `shared`: shared design tokens

## Notes

- Users start with **10 free credits** per `AGENTS.md` section 5 (there is an earlier 0.1 credit note that conflicts).
- AI calls are server-side only via Cloudflare AI Gateway.
- Clients never display credit balances.

## Local setup (high level)

- Configure env files from the `.env.example` files in each package.
- Install dependencies per package.
- Deploy/serve Firebase functions from `backend`.

