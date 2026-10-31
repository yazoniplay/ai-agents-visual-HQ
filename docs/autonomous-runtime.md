## Tonkas Town autonomous runtime

The FastAPI service in `backend/` stores agents, tasks, messages, approvals, settings, and activity in SQLite. Render's attached disk preserves the database across deploys. The GitHub Pages village connects to this API over HTTPS.

Matt is the CEO/orchestrator. When autonomy is enabled, he reviews the company goal, agents, open work, and recent activity. He creates internal tasks, sends internal messages, and requests owner decisions. Specialist agents execute assigned tasks using the selected model provider and return written deliverables to Matt. Each cycle is bounded to at most three new tasks and two approvals; no more than two tasks are started per cycle.

### Safety and capability boundaries

This first runtime has model-backed planning and internal task execution. It does not have arbitrary shell, browser, payment, social-media, email, or account access. It cannot truthfully claim it has published, purchased, contacted a customer, deployed code, or changed an account. Those actions need a separately implemented integration and an owner approval gate.

At least one provider API key is required. API usage is billed separately; ChatGPT, Claude, and Gemini consumer subscriptions do not automatically provide API credit. Keep keys in Render environment variables or an untracked local `.env` file. Never put keys in the frontend, GitHub, `index.html`, or `VITE_*` variables.

### Deploy on Render

1. Connect this repository to Render and create a Blueprint from `render.yaml`.
2. Render creates the Python web service and a 1 GB persistent disk in Frankfurt.
3. In the service Environment page, add at least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`.
4. Set `HQ_DEFAULT_PROVIDER` to the provider whose key you added. Optional model overrides are in `backend/.env.example`.
5. Copy the service's public HTTPS URL. In the village, open **HQ Live → Settings**, paste the URL and generated `HQ_ADMIN_TOKEN`, then save.
6. Confirm the provider indicator is ready. Start autonomy manually from HQ Live.

The generated admin token is a private control credential. Do not share it publicly. Provider keys never leave the backend. The browser sends only the admin token over HTTPS for owner commands.

### API

- `GET /health`
- `GET /api/hq/config`
- `GET /api/hq/snapshot`
- `GET /api/hq/events` (SSE snapshots)
- `POST /api/hq/commands` with `X-HQ-Admin-Token`
  - `autonomy.start`, `autonomy.stop`, `matt.run`
  - `task.create`, `agent.message`, `approval.answer`, `company.goal`

Read endpoints are public in this first version. Do not store sensitive customer data until read authentication is added. Set `HQ_ALLOWED_ORIGINS` to the exact dashboard origin.

### Local run

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
cp .env.example .env
# add a provider API key to .env
set -a && . ./.env && set +a
uvicorn app.main:app --reload --port 8000
```

Do not enable autonomy until a valid API key and usage limits are configured.
