export type LiveAgent = {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  status: "idle" | "working" | "waiting" | "meeting" | "error";
  currentTask?: string;
  position?: { x: number; y: number };
  updatedAt: string;
};

export type Approval = {
  id: string;
  agentName: string;
  question: string;
  context: string;
  recommendedAnswer: string;
  options: { id: string; label: string; consequence: string }[];
  createdAt: string;
};

export type HQSnapshot = {
  updatedAt: string;
  company: { name: string; currency: string; budgetAvailable: number; revenueToDate: number; monthlySpend: number };
  agents: LiveAgent[];
  approvals: Approval[];
  departments: { id: string; taskCount: number; activeCount: number; summary?: string }[];
  activity: { id: string; title: string; detail: string; createdAt: string }[];
};

export type ConnectionState = "not-configured" | "connecting" | "connected" | "error";

const baseUrl = (import.meta.env.VITE_HQ_API_URL as string | undefined)?.replace(/\/$/, "");

export function getHQBackendUrl() {
  return baseUrl || null;
}

export async function fetchHQSnapshot(signal?: AbortSignal): Promise<HQSnapshot> {
  if (!baseUrl) throw new Error("VITE_HQ_API_URL is not configured.");
  const response = await fetch(`${baseUrl}/api/hq/snapshot`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error(`HQ backend returned HTTP ${response.status}.`);
  return response.json() as Promise<HQSnapshot>;
}

export function subscribeHQEvents(onSnapshot: (snapshot: HQSnapshot) => void, onError: () => void) {
  if (!baseUrl) return () => undefined;
  const stream = new EventSource(`${baseUrl}/api/hq/events`, { withCredentials: true });
  stream.addEventListener("snapshot", (event) => {
    try {
      onSnapshot(JSON.parse((event as MessageEvent<string>).data) as HQSnapshot);
    } catch {
      onError();
    }
  });
  stream.onerror = onError;
  return () => stream.close();
}

export async function submitHQCommand(command: Record<string, unknown>) {
  if (!baseUrl) throw new Error("HQ backend is not connected.");
  const response = await fetch(`${baseUrl}/api/hq/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`Command rejected with HTTP ${response.status}.`);
  return response.json() as Promise<{ accepted: boolean; commandId?: string }>;
}
