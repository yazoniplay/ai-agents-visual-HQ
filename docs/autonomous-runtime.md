# Tonkas Town — Supabase Runtime

Tonkas Town is a pixel-art control center for an autonomous AI-operated online business.

## Architecture

- **Dashboard:** static Tonkas Town page hosted on GitHub Pages.
- **Database:** Supabase Postgres in the existing `ai-hive-db` project (EU North). Tonkas tables are isolated by their `tonkas_` prefix.
- **Runtime:** Supabase Edge Function `tonkas-hq`.
- **Scheduling:** Supabase Cron invokes the Edge Function every five minutes.
- **Orchestrator:** Matt, the autonomous CEO and Chief of Staff.
- **Specialists:** Dennis (research), Finn (sales/orders), Bunc (product operations), Maverick (marketing), Pham (finance), Luke (engineering), Trevor (quality/risk), Ivy (customer research), and Noah (operations analytics).

## Provider routing

| Work | Provider | Model |
|---|---|---|
| Matt — CEO, planning and delegation | AshnaAI | `claude-opus-5` |
| Research — Dennis and Ivy | Google Gemini | Configurable with `GEMINI_MODEL` |
| Marketing — Maverick | Google Gemini | Configurable with `GEMINI_MODEL` |
| Other specialist work | AshnaAI | `ASHNA_DEFAULT_MODEL` (default `claude-sonnet-5`) |
| Lightweight / low-priority tasks | Groq by default, or Ollama | Configurable |

There are **no direct OpenAI or Anthropic API integrations**. Matt is pinned to AshnaAI's `claude-opus-5`; the runtime does not silently move Matt to another provider. Gemini is the primary route for research and marketing. Low-priority tasks use the configured lightweight provider when its credentials or endpoint are available, then fall back to that agent's normal primary provider if the lightweight request fails.

The `HQ_AGENT_PROVIDER_MAP` secret can override an individual agent's provider using only `ashnaai`, `gemini`, `groq`, or `ollama`.

## Current runtime capabilities

When autonomy is enabled, Matt reviews the company goal, agent roster, open work, completed reports, team messages, and recent activity. He can create internal tasks, message specialists, and raise owner decisions with exactly five options. A specialist completes one queued internal task per scheduled cycle and returns a written deliverable to Matt. The village polls the runtime and displays live roster, task, message, approval, and activity state.

Autonomy is **off by default**. The scheduled job runs every five minutes but does nothing while autonomy is paused. Matt cannot start until the AshnaAI API key is configured.

## Important limits

This is the first live orchestration layer, not a fully equipped company with external integrations. Agents currently have no browser/search, shell, local file access, email, social publishing, payment, Stripe, Gumroad, or Fiverr integration. They must not claim to have performed those actions. External actions require separately implemented connectors and owner approval gates.

The revenue figures in the original village artwork remain sample figures, not live financial data. Push notifications and full per-building operational chat panels are not yet connected.

## Supabase project

- Project: `ai-hive-db`
- Project ref: `vgbsthdvohazsfpgugmu`
- Region: `eu-north-1`
- Function URL: `https://vgbsthdvohazsfpgugmu.supabase.co/functions/v1/tonkas-hq`
- Dashboard URL: `https://yazoniplay.github.io/ai-agents-visual-HQ/`

The database migrations are in `supabase/migrations/`. The function source is in `supabase/functions/tonkas-hq/index.ts`. The function uses custom token verification and does not rely on a public database table policy.

## Configure provider secrets

In Supabase Dashboard, open **Edge Functions → Secrets** for the `ai-hive-db` project. Add:

| Secret | Purpose |
|---|---|
| `ASHNA_API_KEY` | Required. AshnaAI key; Matt uses this for Claude Opus 5. |
| `GEMINI_API_KEY` | Required for Gemini research and marketing agents. |
| `GROQ_API_KEY` | Optional lightweight inference. |
| `OLLAMA_BASE_URL` | Optional Ollama OpenAI-compatible endpoint reachable from Supabase. |
| `OLLAMA_API_KEY` | Optional, only if the Ollama endpoint requires authentication. |

Optional routing and model settings:

- `HQ_MATT_MODEL` = `claude-opus-5` (default; keep this model for Matt).
- `ASHNA_DEFAULT_MODEL` = `claude-sonnet-5` (default for other AshnaAI agents).
- `ASHNA_BASE_URL` = `https://api.ashna.ai/v1/api` (default).
- `GEMINI_MODEL` = `gemini-2.5-flash` (default).
- `GROQ_MODEL` = `llama-3.1-8b-instant` (default).
- `OLLAMA_MODEL` = `qwen3:4b` (default; the model must already be available to that Ollama server).
- `HQ_LIGHTWEIGHT_PROVIDER` = `groq` or `ollama` (default `groq`).
- `HQ_AGENT_PROVIDER_MAP` = JSON object mapping agent IDs to `ashnaai`, `gemini`, `groq`, or `ollama`; for example `{"dennis":"gemini","luke":"ashnaai"}`.

**Ollama networking:** Supabase Edge Functions run in Supabase's cloud. `localhost`, `127.0.0.1`, and a private LAN address on your computer are not reachable from that runtime. To use Ollama, `OLLAMA_BASE_URL` must be an HTTPS endpoint that Supabase can reach. If you only run Ollama on your own computer, leave it unconfigured; lightweight tasks will use Groq when configured or fall back to the agent's primary provider.

Never put provider keys in GitHub, HTML, browser storage, or the public dashboard. The browser only receives the public Supabase publishable key and the private owner token. Consumer AI subscriptions do not automatically include API credit; monitor API usage and set provider-side spending limits.

## Connect the village

1. Open the live dashboard and click **HQ Live**.
2. The Supabase project URL is prefilled.
3. Paste the private owner token supplied during setup into the token field and save.
4. Configure `ASHNA_API_KEY` and `GEMINI_API_KEY` in Supabase Function Secrets; configure Groq/Ollama only if desired.
5. Confirm the configured providers and Matt model are shown, then start autonomy.

The owner token is stored encrypted in Supabase Vault and verified server-side. Do not share it.

## Scheduled worker

A Supabase Cron job named `tonkas-hq-five-minute-cycle` calls the Edge Function every five minutes using a separate secret stored in Vault. The worker is guarded by the autonomy setting in Postgres. To pause all model work, use **Pause Autonomy** in the dashboard; the cron job itself can remain scheduled.

## Security

- All `tonkas_*` tables have RLS enabled.
- `anon` and `authenticated` have no table access.
- Only the Edge Function's server-side secret key can access the tables.
- The owner and cron tokens are stored in Supabase Vault; only a restricted server-side RPC can verify them.
- The function is deployed with platform JWT verification disabled because it implements its own two-token authorization checks. The public publishable key is not an authorization credential.
