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
  { id: "executive", name: "Executive Office", short: "EXECUTIVE", x: 70, y: 55, w: 180, h: 150, color: "#e8bd72", icon: "◆", department: "Leadership", description: "Company direction, priorities and high-level decisions.", crew: ["NOVA"] },
  { id: "research", name: "Research Lab", short: "RESEARCH", x: 290, y: 55, w: 180, h: 150, color: "#a58df4", icon: "⌕", department: "Intelligence", description: "Market research, competitor intelligence and opportunity discovery.", crew: ["ATLAS"] },
  { id: "marketing", name: "Marketing", short: "MARKETING", x: 510, y: 55, w: 180, h: 150, color: "#e78eaf", icon: "✳", department: "Growth", description: "Brand, campaigns, content and customer acquisition.", crew: ["PIXEL"] },
  { id: "sales", name: "Sales Room", short: "SALES", x: 730, y: 55, w: 180, h: 150, color: "#70c9c0", icon: "↗", department: "Commercial", description: "Prospecting, pipeline management and customer relationships.", crew: ["ECHO"] },
  { id: "revenue", name: "Revenue Room", short: "REVENUE", x: 950, y: 55, w: 180, h: 150, color: "#7bd5a7", icon: "＄", department: "Finance", description: "Pricing, revenue strategy, forecasting and financial performance.", crew: ["VAULT"] },
  { id: "design", name: "Design Studio", short: "DESIGN", x: 70, y: 420, w: 180, h: 150, color: "#e5a47b", icon: "◈", department: "Creative", description: "Product interfaces, visual systems and creative direction.", crew: ["MUSE"] },
  { id: "development", name: "Development", short: "DEVELOPMENT", x: 290, y: 420, w: 180, h: 150, color: "#78aef1", icon: "⌘", department: "Engineering", description: "Software architecture, implementation and technical delivery.", crew: ["BYTE"] },
  { id: "meeting", name: "Meeting Room", short: "MEETING", x: 510, y: 420, w: 180, h: 150, color: "#83b6ee", icon: "◎", department: "Collaboration", description: "Cross-department discussions, reviews and company decisions.", crew: ["ORBIT"] },
  { id: "analytics", name: "Analytics", short: "ANALYTICS", x: 730, y: 420, w: 180, h: 150, color: "#c4a0ec", icon: "▥", department: "Insights", description: "Metrics, experiments, reporting and performance analysis.", crew: ["SCOPE"] },
  { id: "quality", name: "Quality Control", short: "QUALITY", x: 950, y: 420, w: 180, h: 150, color: "#d5c17b", icon: "✓", department: "Review", description: "Testing, review and quality gates before work is delivered.", crew: ["PATCH"] },
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
            <svg viewBox="0 0 1200 680" role="img" aria-label="Top-down pixel-art village headquarters with ten department buildings">
              <defs>
                <pattern id="grass" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#6e9e58"/><rect x="4" y="5" width="3" height="3" fill="#82b96b"/><rect x="21" y="11" width="4" height="3" fill="#5c884b"/><rect x="12" y="25" width="3" height="2" fill="#91c477"/><path d="M27 27l2-3" stroke="#507c45" strokeWidth="2"/></pattern>
                <pattern id="pathTiles" width="24" height="20" patternUnits="userSpaceOnUse"><rect width="24" height="20" fill="#c6ad78"/><path d="M0 1H24M0 10H24M0 19H24M7 1V10M18 10V19" stroke="#a68d60" strokeWidth="1.5" opacity=".65"/></pattern>
                <pattern id="roofTiles" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H16M0 6H16M8 0V6M0 6V12" stroke="#ffffff" strokeOpacity=".16" strokeWidth="2"/></pattern>
                <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
              </defs>
              <rect width="1200" height="680" fill="url(#grass)"/>
              <path d="M0 330H1200" stroke="#d5bd8a" strokeWidth="62"/><path d="M0 330H1200" stroke="url(#pathTiles)" strokeWidth="54"/>
              <path d="M160 190V330M380 190V330M600 190V330M820 190V330M1040 190V330M160 330V435M380 330V435M600 330V435M820 330V435M1040 330V435" stroke="#c9b17c" strokeWidth="34" fill="none"/>
              <path d="M160 190V330M380 190V330M600 190V330M820 190V330M1040 190V330M160 330V435M380 330V435M600 330V435M820 330V435M1040 330V435" stroke="url(#pathTiles)" strokeWidth="28" fill="none"/>
              <g opacity=".95">
                <rect x="548" y="270" width="104" height="112" fill="#bba477" stroke="#8d7958" strokeWidth="3"/><rect x="556" y="278" width="88" height="96" fill="#d4c18e" stroke="#eee0b7" strokeWidth="2"/>
                <rect x="586" y="302" width="28" height="28" fill="#78a9a1" stroke="#547e72" strokeWidth="3"/><path d="M600 304V328M588 316H612" stroke="#d6e6b8" strokeWidth="2"/>
                <rect x="570" y="340" width="60" height="10" fill="#876f4f"/><rect x="580" y="350" width="40" height="6" fill="#6d573e"/>
              </g>
              {Array.from({length:18},(_,i)=>{const x=28+(i%9)*142;const y=i<9?24:610;return <g key={i} className="pixel-tree" transform={`translate(${x} ${y})`}><rect x="-5" y="18" width="10" height="18" fill="#76533a"/><rect x="-19" y="2" width="38" height="26" fill="#356b43" stroke="#285638" strokeWidth="3"/><rect x="-13" y="-5" width="25" height="20" fill="#4f874b"/><rect x="-8" y="-1" width="6" height="5" fill="#83b96a"/></g>})}
              {rooms.map((room,index) => {
                const roof=["#a65e43","#6d6b9d","#b65e72","#4c8c87","#b58a45","#b86c45","#527ea5","#5685a5","#8b6ba8","#a38a4e"][index];
                return <g key={room.id} className={`room pixel-building ${selectedRoom===room.id?"room-active":""} ${search&&!visibleRooms.some(item=>item.id===room.id)?"room-dimmed":""}`} onClick={()=>focusRoom(room.id)} role="button" tabIndex={0} aria-label={`Open ${room.name}`} onKeyDown={event=>{if(event.key==="Enter"||event.key===" ")focusRoom(room.id);}}>
                  <rect x={room.x+8} y={room.y+24} width={room.w-16} height={room.h-18} fill="#2d513c" opacity=".3" filter="url(#softShadow)"/>
                  <rect x={room.x+12} y={room.y+38} width={room.w-24} height={room.h-48} fill="#d8c69a" stroke="#806e52" strokeWidth="4"/>
                  <rect x={room.x+17} y={room.y+44} width={room.w-34} height={room.h-60} fill="#c7b48a" stroke="#f0dfb6" strokeWidth="2"/>
                  <path d={`M${room.x+4} ${room.y+54} L${room.x+room.w/2} ${room.y+4} L${room.x+room.w-4} ${room.y+54} Z`} fill={roof} stroke="#493f39" strokeWidth="4"/>
                  <path d={`M${room.x+4} ${room.y+54} L${room.x+room.w/2} ${room.y+4} L${room.x+room.w-4} ${room.y+54} Z`} fill="url(#roofTiles)"/>
                  <path d={`M${room.x+room.w/2} ${room.y+5}V${room.y+54}`} stroke="#ffffff" strokeOpacity=".22" strokeWidth="3"/>
                  <rect x={room.x+23} y={room.y+68} width="26" height="22" fill="#6f9c9c" stroke="#5d594b" strokeWidth="3"/><path d={`M${room.x+36} ${room.y+69}V${room.y+89}M${room.x+24} ${room.y+79}H${room.x+48}`} stroke="#d5e8d4" strokeWidth="2"/>
                  <rect x={room.x+room.w-49} y={room.y+68} width="26" height="22" fill="#6f9c9c" stroke="#5d594b" strokeWidth="3"/><path d={`M${room.x+room.w-36} ${room.y+69}V${room.y+89}M${room.x+room.w-48} ${room.y+79}H${room.x+room.w-24}`} stroke="#d5e8d4" strokeWidth="2"/>
                  <rect x={room.x+room.w/2-13} y={room.y+room.h-44} width="26" height="38" fill="#80583e" stroke="#594331" strokeWidth="3"/><rect x={room.x+room.w/2+6} y={room.y+room.h-25} width="3" height="3" fill="#e9c96f"/>
                  <rect x={room.x+room.w/2-57} y={room.y+room.h-28} width="114" height="17" fill="#f0e4c4" stroke="#8e7957" strokeWidth="2"/>
                  {showLabels&&<text x={room.x+room.w/2} y={room.y+room.h-16} textAnchor="middle" className="pixel-room-label">{room.name.toUpperCase()}</text>}
                  <rect x={room.x+room.w/2-20} y={room.y+room.h-4} width="40" height="7" fill="#9a8057"/>
                </g>;
              })}
              {rooms.map((room,index)=>{const agent=agents.find(a=>a.room===room.id)!;return <Crew key={agent.name} x={room.x+room.w/2} y={room.y+room.h-63} color={agent.color} name={agent.name} selected={selectedAgent===agent.name} onClick={()=>inspectAgent(agent.name)}/>;})}
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
