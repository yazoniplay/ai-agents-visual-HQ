export type LiveAgent = {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  status: string;
  currentTask?: string;
  thought?: string;
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

export type HQMessage = {
  id: string;
  room: string;
  sender: string;
  recipient?: string | null;
  body: string;
  createdAt: string;
};

export type HQSnapshot = {
  updatedAt: string;
  company: { name: string; currency: string; budgetAvailable: number | null; revenueToDate: number | null; monthlySpend: number | null; platformRevenue?: Record<string, number> };
  agents: LiveAgent[];
  tasks: { id: string; title: string; departmentId: string; status: string; assignedTo?: string; updatedAt: string; result?: string }[];
  approvals: Approval[];
  departments: { id: string; taskCount: number; activeCount: number; summary?: string }[];
  activity: { id: string; title: string; detail: string; createdAt: string }[];
  messages: HQMessage[];
  autonomyEnabled: boolean;
  providerStatus?: Record<string, unknown>;
  companyGoal?: string;
};

export type ConnectionState = "not-configured" | "connecting" | "connected" | "error";

const baseUrl = "https://vgbsthdvohazsfpgugmu.supabase.co/functions/v1/tonkas-hq";
const publishableKey = "sb_publishable_ZWLGkmQeAYgdUWoOOArAVw_2qA7xjSM";
const tokenKey = "tonkas-hq-owner-token";

export function getHQBackendUrl() {
  return baseUrl;
}

export function getHQAdminToken() {
  return typeof window === "undefined" ? null : window.sessionStorage.getItem(tokenKey);
}

export function setHQAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(tokenKey, token.trim());
  else window.sessionStorage.removeItem(tokenKey);
}

function authHeaders(): Record<string, string> {
  const token = getHQAdminToken();
  if (!token) throw new Error("Connect Tonkas Town using the HQ owner token first.");
  return {
    apikey: publishableKey,
    "x-hq-admin-token": token,
    Accept: "application/json",
  };
}

function normalizeSnapshot(raw: any): HQSnapshot {
  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const taskById = new Map(rawTasks.map((task: any) => [task.id, task]));
  const agents: LiveAgent[] = (raw.agents ?? []).map((agent: any) => {
    const task: any = taskById.get(agent.current_task);
    const x = Number(agent.x ?? 0.5);
    const y = Number(agent.y ?? 0.5);
    const recent = (raw.activity ?? []).find((item: any) => String(item.actor).toLowerCase() === String(agent.id).toLowerCase());
    return {
      id: String(agent.id),
      name: String(agent.name),
      role: String(agent.role),
      departmentId: String(agent.department),
      status: String(agent.status ?? "idle"),
      currentTask: task?.title,
      thought: recent?.message,
      position: { x: x <= 1.5 ? x * 1400 : x, y: y <= 1.5 ? y * 900 : y },
      updatedAt: String(agent.updated_at ?? raw.server_time ?? new Date().toISOString()),
    };
  });
  const departmentIds = ["command", "research", "factory", "media", "revenue", "war"];
  const tasks = rawTasks.map((task: any) => ({
    id: String(task.id),
    title: String(task.title),
    departmentId: String(task.department ?? agents.find((agent) => agent.id === task.assigned_to)?.departmentId ?? "command"),
    status: String(task.status),
    assignedTo: task.assigned_to ? String(task.assigned_to) : undefined,
    updatedAt: String(task.updated_at ?? task.created_at ?? raw.server_time),
    result: task.result ? String(task.result) : undefined,
  }));
  const approvals: Approval[] = (raw.approvals ?? []).map((item: any) => ({
    id: String(item.id),
    agentName: String(item.created_by ?? "Matt"),
    question: String(item.title),
    context: String(item.context ?? ""),
    recommendedAnswer: String(item.recommended_option ?? ""),
    options: Array.isArray(item.options) ? item.options : [],
    createdAt: String(item.created_at ?? raw.server_time),
  }));
  const activity = (raw.activity ?? []).map((item: any) => ({
    id: String(item.id),
    title: String(item.kind ?? "activity").replaceAll(".", " ").toUpperCase(),
    detail: String(item.message ?? ""),
    createdAt: String(item.created_at ?? raw.server_time),
  })).reverse();
  const messages: HQMessage[] = (raw.messages ?? []).map((item: any) => ({
    id: String(item.id),
    room: String(item.room),
    sender: String(item.sender_id),
    recipient: item.recipient_id ? String(item.recipient_id) : null,
    body: String(item.content),
    createdAt: String(item.created_at ?? raw.server_time),
  }));
  const departments = departmentIds.map((id) => ({
    id,
    taskCount: tasks.filter((task: HQSnapshot["tasks"][number]) => task.departmentId === id).length,
    activeCount: agents.filter((agent) => agent.departmentId === id && ["working", "planning", "reviewing", "meeting"].includes(agent.status)).length,
  }));
  return {
    updatedAt: String(raw.server_time ?? new Date().toISOString()),
    company: { name: "Tonkas Town", currency: "SEK", budgetAvailable: null, revenueToDate: null, monthlySpend: null },
    agents,
    tasks,
    approvals,
    departments,
    activity,
    messages,
    autonomyEnabled: Boolean(raw.autonomy_enabled),
    providerStatus: raw.provider_status ?? {},
    companyGoal: raw.company_goal ?? "",
  };
}

export async function fetchHQSnapshot(signal?: AbortSignal): Promise<HQSnapshot> {
  const response = await fetch(`${baseUrl}?action=snapshot`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HQ backend returned HTTP ${response.status}.`);
  return normalizeSnapshot(payload);
}

export function subscribeHQEvents(onSnapshot: (snapshot: HQSnapshot) => void, onError: (error?: Error) => void) {
  const timer = window.setInterval(() => {
    fetchHQSnapshot().then(onSnapshot).catch((error: unknown) => onError(error instanceof Error ? error : new Error("HQ polling failed.")));
  }, 5000);
  return () => window.clearInterval(timer);
}

export async function submitHQCommand(command: Record<string, unknown>) {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "command", command }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Command rejected with HTTP ${response.status}.`);
  return payload as { accepted?: boolean; commandId?: string; ok?: boolean };
}
