# Tonkas Town — Autonomous AI HQ

Tonkas Town is a pixel-art control center for a small AI-operated online business.

## Live architecture

- **Dashboard:** GitHub Pages — `https://yazoniplay.github.io/ai-agents-visual-HQ/`
- **Runtime:** Supabase Edge Function — `tonkas-hq`
- **Persistence:** Supabase Postgres — project `ai-hive-db` (`vgbsthdvohazsfpgugmu`)
- **Scheduling:** Supabase Cron, every five minutes
- **Orchestrator:** Matt, autonomous CEO and Chief of Staff
- **Specialists:** Dennis, Finn, Bunc, Maverick, Pham, Luke, Trevor, Ivy, and Noah

## AI provider routing

- **Matt:** AshnaAI `claude-opus-5` — fixed model for planning, delegation, and coordination.
- **Research:** Gemini for Dennis and Ivy.
- **Marketing:** Gemini for Maverick.
- **Other specialist work:** AshnaAI by default.
- **Small / low-priority tasks:** Groq by default, with Ollama as an optional alternative.

No direct OpenAI or Anthropic API integrations are used. Read [the Supabase runtime guide](docs/autonomous-runtime.md) for the complete routing and secret configuration.

## What works

Matt can plan, delegate internal work, read specialist reports, send internal messages, and ask the owner for a decision with exactly five options. Specialist agents can complete one queued internal task per five-minute cycle. Tasks, messages, approvals, agent status, and activity persist in Postgres. Autonomy is paused by default.

## Not yet integrated

Browser research, email, social publishing, payments, Stripe, Gumroad, Fiverr, push notifications, and arbitrary code execution are not connected. Gemini research tasks currently generate internal research briefs; they do not browse the live web. Sample revenue figures in the original village artwork are not live data. Do not treat an agent's generated statement as proof of an external action.

## Setup

Read [the Supabase runtime guide](docs/autonomous-runtime.md). Add provider API keys as Supabase Edge Function secrets, connect the village using its owner token, and start autonomy manually. Never commit API keys or owner tokens.
