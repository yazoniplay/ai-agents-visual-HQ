# Tonkas Town — Supabase Runtime

Tonkas Town is a pixel-art control center for an autonomous AI-operated online business.

## Architecture

- **Dashboard:** static Tonkas Town page hosted on GitHub Pages.
- **Database:** Supabase Postgres in the existing `ai-hive-db` project (EU North). Tonkas tables are isolated by their `tonkas_` prefix.
- **Runtime:** Supabase Edge Function `tonkas-hq`.
- **Scheduling:** Supabase Cron invokes the Edge Function every five minutes.
- **Orchestrator:** Matt, the autonomous CEO and Chief of Staff.
- **Specialists:** Dennis (research), Finn (sales/orders), Bunc (product operations), Maverick (marketing), Pham (finance), Luke (engineering), Trevor (quality/risk), Ivy (customer research), and Noah (operations analytics).
- **Models:** OpenAI, Anthropic, or Gemini APIs. Provider keys stay in Supabase Function Secrets.

## Current runtime capabilities

When autonomy is enabled, Matt reviews the company goal, agent roster, open work, completed reports, team messages, and recent activity. He can create internal tasks, message specialists, and raise owner decisions with exactly five options. A specialist completes one queued task per scheduled cycle and returns a written deliverable to Matt. The village polls the runtime and displays live roster, task, message, approval, and activity state.

Autonomy is **off by default**. The scheduled job runs every five minutes but does nothing while autonomy is paused. This limits surprise API usage.

## Important limits

This is the first live orchestration layer, not a fully equipped company with external integrations. Agents currently have no browser/search, shell, local file access, email, social publishing, payment, Stripe, Gumroad, or Fiverr integration. They must not claim to have performed those actions. External actions require separately implemented connectors and owner approval gates.

The revenue figures in the original village artwork remain sample figures, not live financial data. Push notifications and full per-building operational chat panels are not yet connected.

## Supabase project

- Project: `ai-hive-db`
- Project ref: `vgbsthdvohazsfpgugmu`
- Region: `eu-north-1`
- Function URL: `https://vgbsthdvohazsfpgugmu.supabase.co/functions/v1/tonkas-hq`
- Dashboard URL: `https://yazoniplay.github.io/ai-agents-visual-HQ/`

The database migrations are in `supabase/migrations/`. The function source is in `supabase/functions/tonkas-hq/index.ts`. The function is deployed with custom token verification; it does not rely on a public database table policy.

## Add model API keys

In Supabase Dashboard, open **Edge Functions → Secrets** for the `ai-hive-db` project. Add at least one provider key:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Also add:

- `HQ_DEFAULT_PROVIDER` = `openai`, `anthropic`, or `gemini`
- `HQ_MATT_PROVIDER` = provider Matt should use (optional; defaults to `HQ_DEFAULT_PROVIDER`)
- `HQ_AGENT_PROVIDER_MAP` = JSON object mapping agent IDs to providers (optional), e.g. `{"dennis":"gemini","luke":"openai"}`

Optional model overrides:

- `OPENAI_MODEL` (default `gpt-4.1-mini`)
- `ANTHROPIC_MODEL` (default `claude-haiku-4-5-20251001`)
- `GEMINI_MODEL` (default `gemini-2.5-flash`)

Do not put provider keys in GitHub, HTML, browser storage, or the public dashboard. A consumer ChatGPT/Claude/Gemini subscription does not automatically include API credit; provider API usage is billed separately and must be monitored.

## Connect the village

1. Open the live dashboard and click **HQ Live**.
2. The Supabase project URL is prefilled.
3. Paste the private owner token supplied during setup into the token field and save.
4. Add at least one model API key in Supabase Function Secrets.
5. Confirm the provider is shown as configured, then start autonomy.

The owner token is stored encrypted in Supabase Vault and verified server-side. Do not share it. The browser receives only the public Supabase publishable key and the owner token.

## Scheduled worker

A Supabase Cron job named `tonkas-hq-five-minute-cycle` calls the Edge Function every five minutes using a separate secret stored in Vault. The worker is guarded by the autonomy setting in Postgres. To pause all model work, use **Pause Autonomy** in the dashboard; the cron job itself can remain scheduled.

## Security

- All `tonkas_*` tables have RLS enabled.
- `anon` and `authenticated` have no table access.
- Only the Edge Function's server-side secret key can access the tables.
- The owner and cron tokens are stored in Supabase Vault; only a restricted server-side RPC can verify them.
- The function is deployed with platform JWT verification disabled because it implements its own two-token authorization checks. The public publishable key is not an authorization credential.
