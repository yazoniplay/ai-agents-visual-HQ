# AI HQ backend integration contract

The village UI is a frontend. It does not run agents itself. Configure `VITE_HQ_API_URL` to the HTTPS origin of the Python/OpenClaw gateway to enable live data.

## Required endpoints

- `GET /api/hq/snapshot` — returns the complete `HQSnapshot` JSON object.
- `GET /api/hq/events` — Server-Sent Events stream. Emit events named `snapshot`; each event's data is a complete `HQSnapshot` JSON object.
- `POST /api/hq/commands` — accepts a command JSON object and returns `{ "accepted": true, "commandId": "..." }`.

## Snapshot shape

```json
{
  "updatedAt": "2026-10-31T12:00:00Z",
  "company": {
    "name": "My Company",
    "currency": "EUR",
    "budgetAvailable": 2500,
    "revenueToDate": 840,
    "monthlySpend": 125
  },
  "agents": [
    {
      "id": "researcher-1",
      "name": "Finn",
      "role": "Research agent",
      "departmentId": "research",
      "status": "working",
      "currentTask": "Validate customer demand",
      "position": { "x": 720, "y": 430 },
      "updatedAt": "2026-10-31T12:00:00Z"
    }
  ],
  "approvals": [
    {
      "id": "approval-1",
      "agentName": "Matt",
      "question": "Should we test this product?",
      "context": "The research agent found repeated customer complaints.",
      "recommendedAnswer": "Run a small validation test",
      "options": [
        { "id": "yes", "label": "Run a small test", "consequence": "Uses the approved test budget." },
        { "id": "no", "label": "Reject the idea", "consequence": "The opportunity is archived." }
      ],
      "createdAt": "2026-10-31T12:00:00Z"
    }
  ],
  "departments": [
    { "id": "research", "taskCount": 3, "activeCount": 1, "summary": "Demand validation" }
  ],
  "activity": [
    { "id": "event-1", "title": "Research started", "detail": "Finn began validating demand.", "createdAt": "2026-10-31T12:00:00Z" }
  ]
}
```

## Command examples

```json
{ "type": "task.create", "departmentId": "factory", "title": "Prepare product mockups" }
{ "type": "approval.answer", "approvalId": "approval-1", "optionId": "yes" }
{ "type": "agent.message", "departmentId": "research", "message": "Compare these two niches." }
```

## Deployment and security

1. Set `VITE_HQ_API_URL` in the frontend build environment.
2. Host the API on your VPS behind HTTPS.
3. Configure CORS for the exact GitHub Pages origin and allow credentials only if using secure session cookies.
4. Authenticate users on the backend. Do not put VPS passwords, model API keys, OpenClaw tokens, or other secrets in `VITE_*` variables; frontend variables are public.
5. The backend owns agent execution, durable memory, task queues, approval records, and audit history. The UI only renders the state it receives.
