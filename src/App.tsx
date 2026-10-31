import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
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
  { id: "executive", name: "Executive Office", short: "EXECUTIVE", x: 410, y: 42, w: 250, h: 142, color: "#e8bd72", icon: "◆", department: "Leadership", description: "Company direction, priorities and high-level decisions.", crew: ["NOVA"] },
  { id: "research", name: "Research Lab", short: "RESEARCH", x: 76, y: 42, w: 250, h: 142, color: "#a58df4", icon: "⌕", department: "Intelligence", description: "Market research, competitor intelligence and opportunity discovery.", crew: ["ATLAS"] },
  { id: "marketing", name: "Marketing", short: "MARKETING", x: 76, y: 258, w: 250, h: 142, color: "#e78eaf", icon: "✳", department: "Growth", description: "Brand, campaigns, content and customer acquisition.", crew: ["PIXEL"] },
  { id: "sales", name: "Sales Room", short: "SALES", x: 76, y: 474, w: 250, h: 142, color: "#70c9c0", icon: "↗", department: "Commercial", description: "Prospecting, pipeline management and customer relationships.", crew: ["ECHO"] },
  { id: "revenue", name: "Revenue Room", short: "REVENUE", x: 410, y: 258, w: 250, h: 142, color: "#7bd5a7", icon: "＄", department: "Finance", description: "Pricing, revenue strategy, forecasting and financial performance.", crew: ["VAULT"] },
  { id: "meeting", name: "Meeting Room", short: "MEETING", x: 410, y: 474, w: 250, h: 142, color: "#83b6ee", icon: "◎", department: "Collaboration", description: "Cross-department discussions, reviews and company decisions.", crew: ["ORBIT"] },
  { id: "design", name: "Design Studio", short: "DESIGN", x: 744, y: 42, w: 250, h: 142, color: "#e5a47b", icon: "◈", department: "Creative", description: "Product interfaces, visual systems and creative direction.", crew: ["MUSE"] },
  { id: "development", name: "Development", short: "DEVELOPMENT", x: 744, y: 258, w: 250, h: 142, color: "#78aef1", icon: "⌘", department: "Engineering", description: "Software architecture, implementation and technical delivery.", crew: ["BYTE"] },
  { id: "analytics", name: "Analytics", short: "ANALYTICS", x: 744, y: 474, w: 250, h: 142, color: "#c4a0ec", icon: "▥", department: "Insights", description: "Metrics, experiments, reporting and performance analysis.", crew: ["SCOPE"] },
  { id: "quality", name: "Quality Control", short: "QUALITY", x: 1078, y: 258, w: 90, h: 358, color: "#d5c17b", icon: "✓", department: "Review", description: "Testing, review and quality gates before work is delivered.", crew: ["PATCH"] },
];

const agents = [
  { name: "NOVA", role: "Chief Executive", room: "executive", color: "#e8bd72", focus: "Strategy and company priorities" },
  { name: "ATLAS", role: "Research Director", room: "research", color: "#a58df4", focus: "Market intelligence and opportunity discovery" },
  { name: "PIXEL", role: "Marketing Lead", room: "marketing", color: "#e78eaf", focus: "Positioning, campaigns and content" },
  { name: "ECHO", role: "Sales Director", room: "sales", color: "#70c9c0", focus: "Pipeline and customer acquisition" },
  { name: "VAULT", role: "Finance Lead", room: "revenue", color: "#7bd5a7", focus: "Pricing and financial planning" },
  { name: "ORBIT", role: "Operations Coordinator", room: "meeting", color: "#83b6ee", focus: "Cross-team coordination" },
  { name: "MUSE", role: "Creative Director", room: "design", color: "#e5a47b", focus: "Product and visual design" },
  { name: "BYTE", role: "Software Engineer", room: "development", color: "#78aef1", focus: "Architecture and implementation" },
  { name: "SCOPE", role: "Data Analyst", room: "analytics", color: "#c4a0ec", focus: "Metrics and performance analysis" },
  { name: "PATCH", role: "QA Engineer", room: "quality", color: "#d5c17b", focus: "Testing and quality review" },
];

type Task = { id: number; title: string; room: string; status: "Queued" | "In progress" | "Done"; created: string };
type LocalEvent = { id: number; title: string; detail: string; time: string };
type LocalMessage = { id: number; room: string; body: string; time: string };

function Crew({ x, y, color, name, selected, onClick }: {
  x: number; y: number; color: string; name: string; selected?: boolean; onClick: () => void;
}) {
  return <g className={`crew ${selected ? "crew-selected" : ""}`} transform={`translate(${x} ${y})`} onClick={(event) => { event.stopPropagation(); onClick(); }} role="button" tabIndex={0} aria-label={`Inspect ${name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }}>
    {selected && <ellipse cx="0" cy="12" rx="29" ry="28" fill={color} opacity=".18" />}
    <ellipse cx="0" cy="19" rx="17" ry="5" fill="#03060b" opacity=".55" />
    <path d="M-15 8 L-15 -10 Q-15 -25 0 -25 Q15 -25 15 -10 L15 8 Q15 16 8 16 L5 16 L5 9 L-5 9 L-5 16 L-8 16 Q-15 16 -15 8Z" fill={color} stroke="#f5f7fb" strokeOpacity=".48" strokeWidth="1.4" />
    <rect x="-1" y="-17" width="22" height="12" rx="6" fill="#a9d8e7" stroke="#e7f8ff" strokeWidth="1.4" />
    <text x="0" y="34" textAnchor="middle" className="crew-name">{name}</text>
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

  const activeRoom = rooms.find((room) => room.id === selectedRoom) ?? null;
  const activeAgent = agents.find((agent) => agent.name === selectedAgent) ?? null;
  const visibleRooms = useMemo(() => rooms.filter((room) => room.name.toLowerCase().includes(search.toLowerCase()) || room.department.toLowerCase().includes(search.toLowerCase())), [search]);
  const roomTasks = tasks.filter((task) => task.room === selectedRoom);
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
    setMessages((current) => [...current, { id: Date.now(), room: selectedRoom, body, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    recordEvent("Local note posted", `${activeRoom?.name} · message saved in this preview`);
    setMessageDraft("");
  };

  return <main className="game-shell">
    <div className="starfield" />
    <header className="topbar">
      <a className="brand" href="/" aria-label="AI HQ home"><span className="brand-mark"><span /></span><span>AI<span className="brand-muted">HQ</span></span><span className="build-tag">PRE-ALPHA</span></a>
      <div className="top-center"><span className="connection-dot" /><span>HEADQUARTERS</span><span className="top-divider">/</span><span className="muted">OPERATIONS</span></div>
      <div className="top-actions"><div className="world-status"><span className="status-square" /> LOCAL PREVIEW</div><button className="icon-button" aria-label="Activity" onClick={() => setFeedOpen(!feedOpen)}><Activity size={17} /></button><button className="icon-button" aria-label="Settings"><Settings2 size={17} /></button><div className="avatar">Y</div></div>
    </header>

    <section className="game-content phase-two-content">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR COMPANY, IN MOTION</div><h1>Headquarters <span>operations</span></h1><p>Explore departments, organize work, and inspect the workforce.</p></div>
        <div className="map-meta"><div><span className="meta-label">DEPARTMENTS</span><strong>10 <small>/ 10</small></strong></div><div><span className="meta-label">AGENT PROFILES</span><strong>10 <small>/ 10</small></strong></div><div><span className="meta-label">BACKEND</span><strong className="offline-label"><i /> NOT CONNECTED</strong></div></div>
      </div>

      <div className="map-toolbar">
        <div className="map-location"><Radio size={14} /><span>STATION A-01</span><span className="toolbar-separator">•</span><span className="muted">FLOOR 01</span></div>
        <div className="map-controls"><label className="search-box"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a room..." /></label><button className={showLabels ? "tool-button active" : "tool-button"} onClick={() => setShowLabels(!showLabels)}>ROOM LABELS</button><button className="tool-button square" onClick={() => setZoom(Math.max(.75, +(zoom - .1).toFixed(1)))} aria-label="Zoom out">−</button><span className="zoom-value">{Math.round(zoom * 100)}%</span><button className="tool-button square" onClick={() => setZoom(Math.min(1.25, +(zoom + .1).toFixed(1)))} aria-label="Zoom in">+</button><button className="tool-button square" onClick={() => { setZoom(1); setSelectedRoom(null); setSelectedAgent(null); }} aria-label="Reset map">⌖</button></div>
      </div>

      <div className="world-layout phase-two-layout">
        <section className="map-frame" aria-label="Interactive headquarters map">
          <div className="map-vignette" /><div className="map-coordinate coordinate-a">SECTOR 01 / NORTH</div><div className="map-coordinate coordinate-b">AIHQ // 001.04</div>
          <div className="map-canvas" style={{ transform: `scale(${zoom})` }}>
            <svg viewBox="0 0 1200 680" role="img" aria-label="Top-down map of ten connected AI HQ departments">
              <defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#8ba1bd" strokeOpacity=".075" /></pattern><pattern id="floor" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 L18 0" stroke="#a4b4c8" strokeOpacity=".035" /></pattern><filter id="roomGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12" /></filter></defs>
              <rect width="1200" height="680" fill="url(#grid)" />
              <g className="corridors"><path d="M326 112 H410 M660 112 H744 M201 184 V258 M535 184 V258 M869 184 V258 M201 400 V474 M535 400 V474 M869 400 V474 M326 329 H410 M660 329 H744 M994 329 H1078 M994 545 H1078" stroke="#293a4d" strokeWidth="48" strokeLinecap="square" fill="none" /><path d="M326 112 H410 M660 112 H744 M201 184 V258 M535 184 V258 M869 184 V258 M201 400 V474 M535 400 V474 M869 400 V474 M326 329 H410 M660 329 H744 M994 329 H1078 M994 545 H1078" stroke="#587087" strokeOpacity=".36" strokeWidth="1.5" strokeDasharray="5 8" fill="none" /></g>
              {rooms.map((room) => <g key={room.id} className={`room ${selectedRoom === room.id ? "room-active" : ""} ${search && !visibleRooms.some((item) => item.id === room.id) ? "room-dimmed" : ""}`} onClick={() => focusRoom(room.id)} role="button" tabIndex={0} aria-label={`Open ${room.name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") focusRoom(room.id); }}>
                <rect x={room.x - 4} y={room.y - 4} width={room.w + 8} height={room.h + 8} rx="15" fill={room.color} opacity={selectedRoom === room.id ? ".16" : ".055"} filter="url(#roomGlow)" />
                <rect className="room-shell" x={room.x} y={room.y} width={room.w} height={room.h} rx="10" fill="#111c29" stroke={selectedRoom === room.id ? room.color : "#42566b"} strokeWidth={selectedRoom === room.id ? "2.5" : "1.4"} />
                <rect x={room.x + 6} y={room.y + 6} width={room.w - 12} height={room.h - 12} rx="6" fill="url(#floor)" />
                <path d={`M${room.x + 18} ${room.y + 34} H${room.x + room.w - 18}`} stroke={room.color} strokeOpacity=".32" />
                <rect x={room.x + 13} y={room.y + 13} width="5" height="5" rx="1" fill={room.color} />
                <text x={room.x + 27} y={room.y + 19} className="room-index">{room.short}</text>
                {showLabels && <text x={room.x + 18} y={room.y + 58} className="room-name" fontSize={room.w < 100 ? "11" : "15"}>{room.name}</text>}
                <text x={room.x + 18} y={room.y + room.h - 17} className="room-subtitle">{room.department.toUpperCase()}</text>
                <g className="room-props" opacity=".8">{room.id === "meeting" ? <><ellipse cx={room.x + room.w / 2} cy={room.y + 91} rx="49" ry="23" fill="#1e3142" stroke="#587087" /><ellipse cx={room.x + room.w / 2} cy={room.y + 91} rx="35" ry="14" fill="#172738" stroke="#587087" /></> : <><rect x={room.x + room.w - 66} y={room.y + 58} width="42" height="24" rx="3" fill="#1d3041" stroke={room.color} strokeOpacity=".5" /><path d={`M${room.x + room.w - 60} ${room.y + 64} h30 m-30 5 h21 m-21 5 h26`} stroke={room.color} strokeOpacity=".6" strokeWidth="1.5" /></>}</g>
              </g>)}
              {agents.map((agent) => { const room = rooms.find((item) => item.id === agent.room)!; const x = room.id === "quality" ? 1124 : room.x + room.w / 2; const y = room.id === "quality" ? 430 : room.y + room.h / 2 + 8; return <Crew key={agent.name} x={x} y={y} color={agent.color} name={agent.name} selected={selectedAgent === agent.name} onClick={() => inspectAgent(agent.name)} />; })}
            </svg>
          </div>
          <div className="map-legend"><span><i className="legend-agent" /> AGENT PROFILE</span><span><i className="legend-room" /> DEPARTMENT</span><span><i className="legend-path" /> CONNECTED CORRIDOR</span></div><div className="map-compass"><span>N</span><div>✣</div></div>
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
