# Tonkas Town — Autonomous AI HQ

Tonkas Town is a pixel-art control center for a small AI-operated online business.

## Architecture

- **Dashboard:** static HTML/canvas village served by GitHub Pages.
- **Runtime:** FastAPI service in `backend/`.
- **Persistence:** SQLite database on a Render persistent disk.
- **Orchestrator:** Matt, the autonomous CEO and Chief of Staff.
- **Specialists:** Dennis (research), Finn (sales/orders), Bunc (product operations), Maverick (marketing), Pham (finance), Luke (engineering), Trevor (quality/risk), Ivy (customer research), and Noah (operations analytics).
- **Models:** OpenAI, Anthropic, or Gemini API. Provider keys stay on the backend.

## Important

The runtime is not live until the Render service is deployed, a provider API key is configured, and the dashboard is connected. Sample revenue figures in the supplied village artwork are not connected to Stripe, Gumroad, or Fiverr and must not be treated as real financial data.

See [the autonomous runtime guide](docs/autonomous-runtime.md) for deployment and setup.
