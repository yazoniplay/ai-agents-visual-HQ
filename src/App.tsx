import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { fetchHQSnapshot, getHQBackendUrl, subscribeHQEvents, submitHQCommand, type ConnectionState, type HQSnapshot } from "./lib/backend";
import {
  Activity, ArrowLeft, ChevronDown, ChevronRight, CircleHelp, Clock3,
  MessageSquare, Plus, Radio, Search, Send, Settings2, X,
} from "lucide-react";

type Room = {
  id: string; name: string; short: string; x: number; y: number;
  w: number; h: number; color: string; icon: string; department: string;
  description: string; crew: string[];
};

const rooms: Room[] = [
  { id: "revenue", name: "Revenue Bay & Pastures", short: "REVENUE", x: 65, y: 85, w: 255, h: 190, color: "#7bd5a7", icon: "₿", department: "Finance", description: "Revenue streams, cash flow, platform payouts and operating budget.", crew: ["VAULT", "ECHO"] },
  { id: "executive", name: "Command Center", short: "COMMAND", x: 535, y: 45, w: 285, h: 205, color: "#e8bd72", icon: "◆", department: "Leadership", description: "Company-wide operations, budget, agent health and human decisions.", crew: ["MATT"] },
  { id: "marketing", name: "Media Studio", short: "MEDIA", x: 955, y: 65, w: 220, h: 225, color: "#e78eaf", icon: "✳", department: "Marketing", description: "Content production, social publishing and campaign performance.", crew: ["PIXEL", "MUSE"] },
  { id: "research", name: "Research Lab", short: "RESEARCH", x: 770, y: 365, w: 245, h: 175, color: "#70c9c0", icon: "⌕", department: "Intelligence", description: "Business idea generation, customer discovery and validation logs.", crew: ["FINN", "PHAM"] },
  { id: "meeting", name: "War Room", short: "WAR ROOM", x: 1115, y: 585, w: 225, h: 180, color: "#b97863", icon: "◎", department: "Operations", description: "Agent syncs, strategic meetings and cross-team decisions.", crew: ["DENNIS", "LUKE"] },
  { id: "development", name: "Factory", short: "FACTORY", x: 100, y: 620, w: 255, h: 185, color: "#c96b53", icon: "⌘", department: "Production", description: "Product execution, creative assets and delivery pipelines.", crew: ["MAVERICK", "PATCH"] },
];

const agents = [
  { name: "MATT", role: "Chief Executive", room: "executive", color: "#e8bd72", focus: "Company strategy, priorities and approvals" },
  { name: "DENNIS", role: "Operations Lead", room: "meeting", color: "#b97863", focus: "Agent coordination and operating cadence" },
  { name: "FINN", role: "Research Analyst", room: "research", color: "#70c9c0", focus: "Demand research and business validation" },
  { name: "LUKE", role: "Meeting Facilitator", room: "meeting", color: "#83b6ee", focus: "Cross-team decisions and meeting notes" },
  { name: "MAVERICK", role: "Product Builder", room: "development", color: "#c96b53", focus: "Product execution and production pipelines" },
  { name: "PHAM", role: "Market Researcher", room: "research", color: "#a58df4", focus: "Competitor research and customer insights" },
  { name: "PIXEL", role: "Content Producer", room: "marketing", color: "#e78eaf", focus: "Social content and campaign production" },
  { name: "VAULT", role: "Finance Lead", room: "revenue", color: "#7bd5a7", focus: "Revenue, expenses and platform payouts" },
  { name: "ECHO", role: "Growth Strategist", room: "revenue", color: "#70b5a8", focus: "Revenue channels and customer acquisition" },
  { name: "MUSE", role: "Creative Director", room: "marketing", color: "#e5a47b", focus: "Creative direction and brand assets" },
  { name: "PATCH", role: "Quality Engineer", room: "development", color: "#d5c17b", focus: "Quality checks and delivery review" },
];

type Task = { id: number; title: string; room: string; status: "Queued" | "In progress" | "Done"; created: string };
type LocalEvent = { id: number; title: string; detail: string; time: string };
type LocalMessage = { id: number; room: string; body: string; time: string };

function Crew({ x, y, color, name, selected, onClick }: {
  x: number; y: number; color: string; name: string; selected?: boolean; onClick: () => void;
}) {
  return <g className={`crew pixel-crew ${selected ? "crew-selected" : ""}`} transform={`translate(${x} ${y})`} onClick={(event) => { event.stopPropagation(); onClick(); }} role="button" tabIndex={0} aria-label={`Inspect ${name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }}>
    {selected && <rect x="-15" y="-18" width="30" height="34" fill={color} opacity=".24" />}
    <rect x="-11" y="15" width="22" height="4" fill="#243b2d" opacity=".65" />
    <rect x="-8" y="-12" width="16" height="24" fill={color} stroke="#263c43" strokeWidth="2" />
    <rect x="-10" y="-8" width="20" height="10" fill={color} />
    <rect x="-7" y="-7" width="14" height="6" fill="#b9e7e9" stroke="#35515a" strokeWidth="1.5" />
    <rect x="-8" y="10" width="5" height="6" fill="#263c43" /><rect x="3" y="10" width="5" height="6" fill="#263c43" />
    <rect x="-11" y="-15" width="5" height="5" fill={color} /><rect x="6" y="-15" width="5" height="5" fill={color} />
    <text x="0" y="31" textAnchor="middle" className="crew-name">{name}</text>
  </g>;
}

function App() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [search, setSearch] = useState("");
  const [feedOpen, setFeedOpen] = useState(true);
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "tasks" | "conversation" | "history">("overview");
  const [taskTitle, setTaskTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>(getHQBackendUrl() ? "connecting" : "not-configured");
  const [liveSnapshot, setLiveSnapshot] = useState<HQSnapshot | null>(null);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    if (!getHQBackendUrl()) return;
    const controller = new AbortController();
    setConnectionState("connecting");
    fetchHQSnapshot(controller.signal).then((snapshot) => {
      setLiveSnapshot(snapshot);
      setConnectionState("connected");
      setBackendError("");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setConnectionState("error");
      setBackendError(error instanceof Error ? error.message : "Could not connect to HQ backend.");
    });
    const close = subscribeHQEvents((snapshot) => {
      setLiveSnapshot(snapshot);
      setConnectionState("connected");
      setBackendError("");
    }, () => setConnectionState("error"));
    return () => { controller.abort(); close(); };
  }, []);

  const activeRoom = rooms.find((room) => room.id === selectedRoom) ?? null;
  const activeAgent = agents.find((agent) => agent.name === selectedAgent) ?? null;
  const visibleRooms = useMemo(() => rooms.filter((room) => room.name.toLowerCase().includes(search.toLowerCase()) || room.department.toLowerCase().includes(search.toLowerCase())), [search]);
  const roomTasks = tasks.filter((task) => task.room === selectedRoom);
  const liveAgents = liveSnapshot?.agents ?? [];
  const agentFor = (name: string) => liveAgents.find((agent) => agent.name.toLowerCase() === name.toLowerCase());
  const connectionLabel = connectionState === "connected" ? "LIVE BACKEND" : connectionState === "connecting" ? "CONNECTING" : connectionState === "error" ? "CONNECTION ERROR" : "BACKEND NOT SET";
  const roomMessages = messages.filter((message) => message.room === selectedRoom);

  const recordEvent = (title: string, detail: string) => {
    setEvents((current) => [{ id: Date.now(), title, detail, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...current]);
  };
  const focusRoom = (id: string) => {
    setSelectedRoom(id); setSelectedAgent(null); setWorkspaceTab("overview");
  };
  const inspectAgent = (name: string) => {
    const agent = agents.find((item) => item.name === name);
    if (!agent) return;
    setSelectedAgent(name); setSelectedRoom(agent.room); setWorkspaceTab("overview");
  };
  const addTask = (event: FormEvent) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || !selectedRoom) return;
    const task: Task = { id: Date.now(), title, room: selectedRoom, status: "Queued", created: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    if (connectionState === "connected") submitHQCommand({ type: "task.create", departmentId: selectedRoom, title }).catch((error: unknown) => setBackendError(error instanceof Error ? error.message : "Task command failed."));
    setTasks((current) => [task, ...current]);
    recordEvent("Task added", `${title} · ${activeRoom?.name}`);
    setTaskTitle("");
    setWorkspaceTab("tasks");
  };
  const cycleTask = (task: Task) => {
    const next = task.status === "Queued" ? "In progress" : task.status === "In progress" ? "Done" : "Queued";
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: next } : item));
    recordEvent("Task status changed", `${task.title} · ${next}`);
  };
  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const body = messageDraft.trim();
    if (!body || !selectedRoom) return;
    if (connectionState === "connected") submitHQCommand({ type: "agent.message", departmentId: selectedRoom, message: body }).catch((error: unknown) => setBackendError(error instanceof Error ? error.message : "Message command failed."));
    setMessages((current) => [...current, { id: Date.now(), room: selectedRoom, body, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    recordEvent("Local note posted", `${activeRoom?.name} · message saved in this preview`);
    setMessageDraft("");
  };

  return <main className="game-shell">
    <div className="starfield" />
    <header className="topbar">
      <a className="brand" href="/" aria-label="AI HQ home"><span className="brand-mark"><span /></span><span>AI<span className="brand-muted">HQ</span></span><span className="build-tag">PRE-ALPHA</span></a>
      <div className="top-center"><span className="connection-dot" /><span>HEADQUARTERS</span><span className="top-divider">/</span><span className="muted">OPERATIONS</span></div>
      <div className="top-actions"><div className={`world-status ${connectionState === "connected" ? "is-live" : ""}`}><span className="status-square" /> {connectionLabel}</div><button className="icon-button" aria-label="Activity" onClick={() => setFeedOpen(!feedOpen)}><Activity size={17} /></button><button className="icon-button" aria-label="Settings"><Settings2 size={17} /></button><div className="avatar">Y</div></div>
    </header>

    <section className="game-content phase-two-content">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR COMPANY, IN MOTION</div><h1>Headquarters <span>operations</span></h1><p>One village. Every business operation. Your agents at work.</p></div>
        <div className="map-meta"><div><span className="meta-label">DEPARTMENTS</span><strong>10 <small>/ 10</small></strong></div><div><span className="meta-label">AGENT PROFILES</span><strong>10 <small>/ 10</small></strong></div><div><span className="meta-label">BACKEND</span><strong className={connectionState === "connected" ? "live-label" : "offline-label"}><i /> {connectionLabel}</strong></div></div>
      </div>

      <div className="map-toolbar">
        <div className="map-location"><Radio size={14} /><span>GREENFIELD HQ</span><span className="toolbar-separator">•</span><span className="muted">WORLD MAP</span></div>
        <div className="map-controls"><label className="search-box"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a building..." /></label><button className={showLabels ? "tool-button active" : "tool-button"} onClick={() => setShowLabels(!showLabels)}>ROOM LABELS</button><button className="tool-button square" onClick={() => setZoom(Math.max(.75, +(zoom - .1).toFixed(1)))} aria-label="Zoom out">−</button><span className="zoom-value">{Math.round(zoom * 100)}%</span><button className="tool-button square" onClick={() => setZoom(Math.min(1.25, +(zoom + .1).toFixed(1)))} aria-label="Zoom in">+</button><button className="tool-button square" onClick={() => { setZoom(1); setSelectedRoom(null); setSelectedAgent(null); }} aria-label="Reset map">⌖</button></div>
      </div>

      <div className="world-layout phase-two-layout">
        <section className="map-frame" aria-label="Interactive headquarters map">
          <div className="map-vignette" /><div className="map-coordinate coordinate-a">SECTOR 01 / NORTH</div><div className="map-coordinate coordinate-b">AIHQ // 001.04</div>
          <div className="map-canvas" style={{ transform: `scale(${zoom})` }}>
            <VillageMap rooms={rooms} agents={agents} liveAgents={liveAgents} selectedRoom={selectedRoom} selectedAgent={selectedAgent} showLabels={showLabels} search={search} onOpenRoom={focusRoom} onInspectAgent={inspectAgent} />
          </div>
          <div className="map-legend"><span><i className="legend-agent" /> AI AGENT</span><span><i className="legend-room" /> BUSINESS ZONE</span><span><i className="legend-path" /> VILLAGE PATH</span></div><div className="map-compass"><span>N</span><div>✣</div></div>
        </section>

        <aside className="side-panel phase-two-panel">
          {activeAgent ? <div className="panel-content">
            <div className="panel-topline"><span className="eyebrow">PERSONNEL FILE</span><button className="close-button" onClick={() => setSelectedAgent(null)}><X size={15} /></button></div>
            <div className="agent-profile"><div className="agent-portrait" style={{ "--agent-color": activeAgent.color } as CSSProperties}><span className="portrait-glass" /></div><h2>{activeAgent.name}</h2><span className="agent-role">{activeAgent.role}</span><span className="preview-pill">PROFILE PLACEHOLDER</span></div>
            <div className="panel-divider" /><div className="detail-row"><span>DEPARTMENT</span><strong>{rooms.find((r) => r.id === activeAgent.room)?.name}</strong></div><div className="detail-row"><span>RESPONSIBILITY</span><strong>{activeAgent.focus}</strong></div><div className="detail-row"><span>RUNTIME STATUS</span><strong className="offline-label">NOT CONNECTED</strong></div><p className="panel-note">This is a role and identity placeholder. No model is assigned and this agent cannot execute tasks yet.</p>
            <button className="workspace-open" onClick={() => { setSelectedAgent(null); setWorkspaceTab("overview"); }}>OPEN DEPARTMENT <ChevronRight size={14} /></button>
          </div> : activeRoom ? <div className="panel-content">
            <div className="panel-topline"><button className="back-link" onClick={() => { setSelectedRoom(null); setWorkspaceTab("overview"); }}><ArrowLeft size={13} /> MAP OVERVIEW</button><span className="directory-count">DEPT. {String(rooms.indexOf(activeRoom) + 1).padStart(2, "0")}</span></div>
            <div className="room-profile" style={{ "--room-color": activeRoom.color } as CSSProperties}><div className="room-emblem">{activeRoom.icon}</div><div className="eyebrow">{activeRoom.department.toUpperCase()} DIVISION</div><h2>{activeRoom.name}</h2><p>{activeRoom.description}</p></div>
            <div className="room-tabs" role="tablist" aria-label="Department workspace">
              {(["overview", "tasks", "conversation", "history"] as const).map((tab) => <button key={tab} className={workspaceTab === tab ? "room-tab active" : "room-tab"} onClick={() => setWorkspaceTab(tab)}>{tab === "conversation" ? "CHAT" : tab.toUpperCase()}{tab === "tasks" && roomTasks.length > 0 ? <i>{roomTasks.length}</i> : null}</button>)}
            </div>
            {workspaceTab === "overview" && <div className="workspace-section"><div className="section-heading"><span>ASSIGNED PERSONNEL</span><span>{activeRoom.crew.length.toString().padStart(2, "0")}</span></div>{activeRoom.crew.map((name) => { const agent = agents.find((item) => item.name === name)!; return <button className="person-row person-button" key={name} onClick={() => inspectAgent(name)}><span className="mini-agent" style={{ background: agent.color }} /> <span>{agent.name}</span><small>{agent.role}</small><ChevronRight size={13} /></button>; })}<div className="panel-divider" /><div className="workspace-stats"><div><strong>{roomTasks.length}</strong><span>LOCAL TASKS</span></div><div><strong>{roomMessages.length}</strong><span>LOCAL NOTES</span></div><div><strong>OFF</strong><span>AGENT RUNTIME</span></div></div><div className="connection-notice"><Radio size={15} /><div><strong>Backend not connected</strong><small>Workspace data is saved only in this open preview session.</small></div></div></div>}
            {workspaceTab === "tasks" && <div className="workspace-section"><div className="section-heading"><span>TASK QUEUE</span><span>{roomTasks.length} ITEMS</span></div><form className="task-create" onSubmit={addTask}><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add a department task..." aria-label="New task title" /><button type="submit" disabled={!taskTitle.trim()} aria-label="Add task"><Plus size={16} /></button></form>{roomTasks.length === 0 ? <div className="workspace-empty"><Clock3 size={19} /><strong>No tasks yet</strong><span>Create a task to start organizing this department's queue.</span></div> : <div className="task-list">{roomTasks.map((task) => <div className="task-item" key={task.id}><div className="task-main"><strong>{task.title}</strong><small>Added {task.created} · local preview</small></div><button className={`task-status ${task.status.toLowerCase().replace(" ", "-")}`} onClick={() => cycleTask(task)} title="Click to cycle task status">{task.status}</button></div>)}</div>}<p className="panel-note">Task status changes are local UI interactions. They do not dispatch work to an AI agent.</p></div>}
            {workspaceTab === "conversation" && <div className="workspace-section"><div className="section-heading"><span>DEPARTMENT CHANNEL</span><span>LOCAL ONLY</span></div><div className="chat-placeholder"><MessageSquare size={20} /><strong>No agent connection</strong><span>When the backend is connected, this channel will carry real agent-to-agent and user conversations.</span></div>{roomMessages.map((message) => <div className="local-message" key={message.id}><div><strong>YOU</strong><small>{message.time} · LOCAL NOTE</small></div><p>{message.body}</p></div>)}<form className="chat-compose" onSubmit={sendMessage}><input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a local note..." aria-label="Write a local note" /><button type="submit" disabled={!messageDraft.trim()} aria-label="Post local note"><Send size={15} /></button></form><p className="panel-note">Notes are stored in this browser session only. Sending does not contact an AI.</p></div>}
            {workspaceTab === "history" && <div className="workspace-section"><div className="section-heading"><span>DEPARTMENT HISTORY</span><span>SESSION</span></div>{events.filter((event) => event.detail.includes(activeRoom.name)).length === 0 ? <div className="workspace-empty"><Activity size={19} /><strong>No recorded activity</strong><span>Actions you take in this preview will appear here.</span></div> : <div className="event-list">{events.filter((event) => event.detail.includes(activeRoom.name)).map((event) => <div className="event-item" key={event.id}><i /><div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.time} · USER ACTION</small></div></div>)}</div>}</div>}
          </div> : <div className="panel-content overview-panel">
            <div className="panel-topline"><span className="eyebrow">STATION DIRECTORY</span><span className="directory-count">10 ROOMS</span></div><h2>Explore your<br /><span>headquarters.</span></h2><p className="overview-copy">Select a department or crew member on the map to open its operations workspace.</p><div className="panel-divider" /><div className="section-heading"><span>ALL DEPARTMENTS</span><span>10 / 10</span></div><div className="room-list">{rooms.map((room) => <button key={room.id} className="room-list-item" onClick={() => focusRoom(room.id)}><span className="room-list-dot" style={{ background: room.color }} /><span>{room.name}</span><ChevronRight size={14} /></button>)}</div><div className="map-tip"><CircleHelp size={15} /><span>SELECT A CHARACTER TO INSPECT ITS ROLE AND DEPARTMENT.</span></div>
          </div>}
        </aside>
      </div>

      <footer className="bottom-status"><div><span className="status-square" /> <strong>LOCAL WORLD VIEW</strong><span className="footer-muted">· NO LIVE AGENTS</span></div><div className="footer-right"><span>BUILD 0.2.0</span><span>•</span><span>PHASE 02</span><span>•</span><span>© AI HQ</span></div></footer>
    </section>

    {feedOpen && <aside className="activity-drawer"><div className="drawer-heading"><div><span className="eyebrow">SESSION JOURNAL</span><h3>Activity history</h3></div><button className="close-button" onClick={() => setFeedOpen(false)}><X size={15} /></button></div><div className="drawer-status"><span className="status-square" /> LOCAL PREVIEW EVENTS ONLY</div>{events.length === 0 ? <div className="drawer-empty"><Activity size={18} /><strong>Nothing recorded yet</strong><span>Your actions in this preview will appear here. AI agent events require a connected backend.</span></div> : <div className="event-list">{events.map((event) => <div className="event-item" key={event.id}><i /><div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.time} · USER ACTION</small></div></div>)}</div>}</aside>}
    <button className="feed-toggle" onClick={() => setFeedOpen(!feedOpen)}><Activity size={14} /> {feedOpen ? "HIDE JOURNAL" : "ACTIVITY JOURNAL"} <span>{events.length}</span></button>
    <div className="dynamic-notch"><div className="notch-camera" /><span className="notch-mark"><span /></span><span className="notch-title">AI HQ</span><span className="notch-divider" /><span className="notch-state"><i /> LOCAL PREVIEW</span><ChevronDown size={13} className="notch-chevron" /></div>
  </main>;
}

export default App;
