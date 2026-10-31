import { useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, Bell, ChevronDown, ChevronRight, CircleHelp,
  Command, Cpu, DoorOpen, Maximize2, MessageSquare, Minus, Plus,
  Radio, Search, Settings2, ShieldCheck, Users, Wallet, X,
} from "lucide-react";

type Room = {
  id: string; name: string; short: string; x: number; y: number;
  w: number; h: number; color: string; icon: string; department: string;
  description: string; crew: string[];
};

const rooms: Room[] = [
  { id: "executive", name: "Executive Office", short: "EXECUTIVE", x: 410, y: 42, w: 250, h: 142, color: "#e8bd72", icon: "◆", department: "Leadership", description: "Company direction, priorities and high-level decisions.", crew: ["CEO", "COO"] },
  { id: "research", name: "Research Lab", short: "RESEARCH", x: 76, y: 42, w: 250, h: 142, color: "#a58df4", icon: "⌕", department: "Intelligence", description: "Market research, competitor intelligence and opportunity discovery.", crew: ["Research Director"] },
  { id: "marketing", name: "Marketing", short: "MARKETING", x: 76, y: 258, w: 250, h: 142, color: "#e78eaf", icon: "✳", department: "Growth", description: "Brand, campaigns, content and customer acquisition.", crew: ["CMO", "Content Strategist"] },
  { id: "sales", name: "Sales Room", short: "SALES", x: 76, y: 474, w: 250, h: 142, color: "#70c9c0", icon: "↗", department: "Commercial", description: "Prospecting, pipeline management and customer relationships.", crew: ["Sales Director"] },
  { id: "revenue", name: "Revenue Room", short: "REVENUE", x: 410, y: 258, w: 250, h: 142, color: "#7bd5a7", icon: "＄", department: "Finance", description: "Pricing, revenue strategy, forecasting and financial performance.", crew: ["CFO", "Revenue Analyst"] },
  { id: "meeting", name: "Meeting Room", short: "MEETING", x: 410, y: 474, w: 250, h: 142, color: "#83b6ee", icon: "◎", department: "Collaboration", description: "Cross-department discussions, reviews and company decisions.", crew: ["All departments"] },
  { id: "design", name: "Design Studio", short: "DESIGN", x: 744, y: 42, w: 250, h: 142, color: "#e5a47b", icon: "◈", department: "Creative", description: "Product interfaces, visual systems and creative direction.", crew: ["Creative Director", "UI Designer"] },
  { id: "development", name: "Development", short: "DEVELOPMENT", x: 744, y: 258, w: 250, h: 142, color: "#78aef1", icon: "⌘", department: "Engineering", description: "Software architecture, implementation and technical delivery.", crew: ["CTO", "Software Engineer"] },
  { id: "analytics", name: "Analytics", short: "ANALYTICS", x: 744, y: 474, w: 250, h: 142, color: "#c4a0ec", icon: "▥", department: "Insights", description: "Metrics, experiments, reporting and performance analysis.", crew: ["Data Analyst"] },
  { id: "quality", name: "Quality Control", short: "QUALITY", x: 1078, y: 258, w: 90, h: 358, color: "#d5c17b", icon: "✓", department: "Review", description: "Testing, review and quality gates before work is delivered.", crew: ["QA Engineer", "Operations"] },
];

const agentSeeds = [
  { name: "NOVA", role: "CEO", room: "executive", x: 522, y: 113, color: "#e8bd72" },
  { name: "ATLAS", role: "Research", room: "research", x: 178, y: 111, color: "#a58df4" },
  { name: "PIXEL", role: "Marketing", room: "marketing", x: 174, y: 329, color: "#e78eaf" },
  { name: "ECHO", role: "Sales", room: "sales", x: 174, y: 545, color: "#70c9c0" },
  { name: "VAULT", role: "CFO", room: "revenue", x: 512, y: 330, color: "#7bd5a7" },
  { name: "ORBIT", role: "Coordinator", room: "meeting", x: 512, y: 545, color: "#83b6ee" },
  { name: "MUSE", role: "Designer", room: "design", x: 842, y: 112, color: "#e5a47b" },
  { name: "BYTE", role: "Developer", room: "development", x: 842, y: 330, color: "#78aef1" },
  { name: "SCOPE", role: "Analyst", room: "analytics", x: 842, y: 545, color: "#c4a0ec" },
  { name: "PATCH", role: "QA", room: "quality", x: 1124, y: 430, color: "#d5c17b" },
];

function Crew({ x, y, color, name, selected, onClick }: {
  x: number; y: number; color: string; name: string; selected?: boolean; onClick: () => void;
}) {
  return (
    <g className={`crew ${selected ? "crew-selected" : ""}`} transform={`translate(${x} ${y})`} onClick={(event) => { event.stopPropagation(); onClick(); }} role="button" tabIndex={0} aria-label={`Inspect ${name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }}>
      {selected && <ellipse cx="0" cy="12" rx="29" ry="28" fill={color} opacity=".18" />}
      <ellipse cx="0" cy="19" rx="17" ry="5" fill="#03060b" opacity=".55" />
      <path d="M-15 8 L-15 -10 Q-15 -25 0 -25 Q15 -25 15 -10 L15 8 Q15 16 8 16 L5 16 L5 9 L-5 9 L-5 16 L-8 16 Q-15 16 -15 8Z" fill={color} stroke="#f5f7fb" strokeOpacity=".48" strokeWidth="1.4" />
      <path d="M-10 -13 Q-10 -21 0 -21 Q9 -21 10 -13 L10 -5 L-10 -5Z" fill={color} />
      <rect x="-1" y="-17" width="22" height="12" rx="6" fill="#a9d8e7" stroke="#e7f8ff" strokeWidth="1.4" />
      <path d="M2 -15 Q10 -17 15 -12" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="-12" y="5" width="8" height="10" rx="3" fill={color} />
      <rect x="4" y="5" width="8" height="10" rx="3" fill={color} />
      <text x="0" y="34" textAnchor="middle" className="crew-name">{name}</text>
    </g>
  );
}

function App() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [search, setSearch] = useState("");
  const [feedOpen, setFeedOpen] = useState(true);

  const activeRoom = rooms.find((room) => room.id === selectedRoom) ?? null;
  const activeAgent = agentSeeds.find((agent) => agent.name === selectedAgent) ?? null;
  const visibleRooms = useMemo(() => rooms.filter((room) => room.name.toLowerCase().includes(search.toLowerCase()) || room.department.toLowerCase().includes(search.toLowerCase())), [search]);

  const focusRoom = (id: string) => {
    setSelectedRoom(id);
    setSelectedAgent(null);
  };

  return (
    <main className="game-shell">
      <div className="starfield" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="AI HQ home">
          <span className="brand-mark"><span /></span>
          <span>AI<span className="brand-muted">HQ</span></span>
          <span className="build-tag">PRE-ALPHA</span>
        </a>
        <div className="top-center">
          <span className="connection-dot" />
          <span>HEADQUARTERS</span>
          <span className="top-divider">/</span>
          <span className="muted">WORLD MAP</span>
        </div>
        <div className="top-actions">
          <div className="world-status"><span className="status-square" /> WORLD PREVIEW</div>
          <button className="icon-button" aria-label="Activity" onClick={() => setFeedOpen(!feedOpen)}><Activity size={17} /></button>
          <button className="icon-button" aria-label="Settings"><Settings2 size={17} /></button>
          <div className="avatar">Y</div>
        </div>
      </header>

      <section className="game-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR COMPANY, IN MOTION</div>
            <h1>Headquarters <span>overview</span></h1>
            <p>Ten departments. One connected workforce.</p>
          </div>
          <div className="map-meta">
            <div><span className="meta-label">DEPARTMENTS</span><strong>10 <small>/ 10</small></strong></div>
            <div><span className="meta-label">AGENT SLOTS</span><strong>10 <small>/ 10</small></strong></div>
            <div><span className="meta-label">SYSTEM</span><strong className="offline-label"><i /> NOT CONNECTED</strong></div>
          </div>
        </div>

        <div className="map-toolbar">
          <div className="map-location"><Radio size={14} /><span>STATION A-01</span><span className="toolbar-separator">•</span><span className="muted">FLOOR 01</span></div>
          <div className="map-controls">
            <label className="search-box"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a room..." /><kbd>⌘ K</kbd></label>
            <button className={showLabels ? "tool-button active" : "tool-button"} onClick={() => setShowLabels(!showLabels)}>ROOM LABELS</button>
            <button className="tool-button square" onClick={() => setZoom(Math.max(.75, +(zoom - .1).toFixed(1)))} aria-label="Zoom out"><Minus size={14} /></button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button className="tool-button square" onClick={() => setZoom(Math.min(1.25, +(zoom + .1).toFixed(1)))} aria-label="Zoom in"><Plus size={14} /></button>
            <button className="tool-button square" onClick={() => { setZoom(1); setSelectedRoom(null); setSelectedAgent(null); }} aria-label="Reset map"><Maximize2 size={14} /></button>
          </div>
        </div>

        <div className="world-layout">
          <section className="map-frame" aria-label="Interactive headquarters map">
            <div className="map-vignette" />
            <div className="map-coordinate coordinate-a">SECTOR 01 / NORTH</div>
            <div className="map-coordinate coordinate-b">AIHQ // 001.04</div>
            <div className="map-canvas" style={{ transform: `scale(${zoom})` }}>
              <svg viewBox="0 0 1200 680" role="img" aria-label="Top-down map of ten connected AI HQ departments">
                <defs>
                  <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#8ba1bd" strokeOpacity=".075" strokeWidth="1" /></pattern>
                  <pattern id="floor" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 L18 0" stroke="#a4b4c8" strokeOpacity=".035" /></pattern>
                  <filter id="roomGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12" /></filter>
                </defs>
                <rect width="1200" height="680" fill="url(#grid)" />
                <g className="corridors">
                  <path d="M326 112 H410 M660 112 H744 M201 184 V258 M535 184 V258 M869 184 V258 M201 400 V474 M535 400 V474 M869 400 V474 M326 329 H410 M660 329 H744 M994 329 H1078 M994 545 H1078" stroke="#293a4d" strokeWidth="48" strokeLinecap="square" fill="none" />
                  <path d="M326 112 H410 M660 112 H744 M201 184 V258 M535 184 V258 M869 184 V258 M201 400 V474 M535 400 V474 M869 400 V474 M326 329 H410 M660 329 H744 M994 329 H1078 M994 545 H1078" stroke="#587087" strokeOpacity=".36" strokeWidth="1.5" strokeDasharray="5 8" fill="none" />
                  <path d="M535 184 V474 M326 329 H994" stroke="#344b60" strokeWidth="1" strokeDasharray="2 10" fill="none" opacity=".55" />
                </g>
                {rooms.map((room) => (
                  <g key={room.id} className={`room ${selectedRoom === room.id ? "room-active" : ""} ${search && !visibleRooms.some((item) => item.id === room.id) ? "room-dimmed" : ""}`} onClick={() => focusRoom(room.id)} role="button" tabIndex={0} aria-label={`Open ${room.name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") focusRoom(room.id); }}>
                    <rect x={room.x - 4} y={room.y - 4} width={room.w + 8} height={room.h + 8} rx="15" fill={room.color} opacity={selectedRoom === room.id ? ".16" : ".055"} filter="url(#roomGlow)" />
                    <rect className="room-shell" x={room.x} y={room.y} width={room.w} height={room.h} rx="10" fill="#111c29" stroke={selectedRoom === room.id ? room.color : "#42566b"} strokeWidth={selectedRoom === room.id ? "2.5" : "1.4"} />
                    <rect x={room.x + 6} y={room.y + 6} width={room.w - 12} height={room.h - 12} rx="6" fill="url(#floor)" />
                    <path d={`M${room.x + 18} ${room.y + 34} H${room.x + room.w - 18}`} stroke={room.color} strokeOpacity=".32" />
                    <rect x={room.x + 13} y={room.y + 13} width="5" height="5" rx="1" fill={room.color} />
                    <text x={room.x + 27} y={room.y + 19} className="room-index">{room.short}</text>
                    {showLabels && <text x={room.x + 18} y={room.y + 58} className="room-name" fontSize={room.w < 100 ? "11" : "15"}>{room.name}</text>}
                    <text x={room.x + 18} y={room.y + room.h - 17} className="room-subtitle">{room.department.toUpperCase()}</text>
                    <g className="room-props" opacity=".8">
                      {room.id === "meeting" ? <><ellipse cx={room.x + room.w / 2} cy={room.y + 91} rx="49" ry="23" fill="#1e3142" stroke="#587087" /><ellipse cx={room.x + room.w / 2} cy={room.y + 91} rx="35" ry="14" fill="#172738" stroke="#587087" /></> :
                        <><rect x={room.x + room.w - 66} y={room.y + 58} width="42" height="24" rx="3" fill="#1d3041" stroke={room.color} strokeOpacity=".5" /><path d={`M${room.x + room.w - 60} ${room.y + 64} h30 m-30 5 h21 m-21 5 h26`} stroke={room.color} strokeOpacity=".6" strokeWidth="1.5" /></>}
                    </g>
                    {selectedRoom === room.id && <rect x={room.x + 3} y={room.y + 3} width={room.w - 6} height={room.h - 6} rx="8" fill="none" stroke={room.color} strokeOpacity=".45" strokeDasharray="4 5" />}
                  </g>
                ))}
                {agentSeeds.map((agent) => (
                  <Crew key={agent.name} x={agent.x} y={agent.y} color={agent.color} name={agent.name} selected={selectedAgent === agent.name} onClick={() => { setSelectedAgent(agent.name); setSelectedRoom(agent.room); }} />
                ))}
                <g className="map-markers">
                  <circle cx="535" cy="218" r="4" fill="#8bb8db" /><circle cx="535" cy="218" r="9" fill="none" stroke="#8bb8db" strokeOpacity=".35" />
                  <circle cx="535" cy="438" r="4" fill="#8bb8db" /><circle cx="535" cy="438" r="9" fill="none" stroke="#8bb8db" strokeOpacity=".35" />
                </g>
              </svg>
            </div>
            <div className="map-legend"><span><i className="legend-agent" /> AGENT</span><span><i className="legend-room" /> DEPARTMENT</span><span><i className="legend-path" /> CONNECTED CORRIDOR</span></div>
            <div className="map-compass"><span>N</span><div>✣</div></div>
          </section>

          <aside className="side-panel">
            {activeAgent ? (
              <div className="panel-content">
                <div className="panel-topline"><span className="eyebrow">PERSONNEL FILE</span><button className="close-button" onClick={() => setSelectedAgent(null)}><X size={15} /></button></div>
                <div className="agent-profile">
                  <div className="agent-portrait" style={{ "--agent-color": activeAgent.color } as React.CSSProperties}><span className="portrait-glass" /></div>
                  <h2>{activeAgent.name}</h2><span className="agent-role">{activeAgent.role}</span>
                  <span className="preview-pill">PREVIEW CHARACTER</span>
                </div>
                <div className="panel-divider" />
                <div className="detail-row"><span>ASSIGNED ROOM</span><strong>{rooms.find((r) => r.id === activeAgent.room)?.name}</strong></div>
                <div className="detail-row"><span>CONNECTION</span><strong className="offline-label">NOT CONNECTED</strong></div>
                <p className="panel-note">This character is a visual placeholder for Phase 1. Live agent state will be connected in a later phase.</p>
              </div>
            ) : activeRoom ? (
              <div className="panel-content">
                <div className="panel-topline"><span className="eyebrow">DEPARTMENT FILE // {String(rooms.indexOf(activeRoom) + 1).padStart(2, "0")}</span><button className="close-button" onClick={() => setSelectedRoom(null)}><X size={15} /></button></div>
                <div className="room-profile" style={{ "--room-color": activeRoom.color } as React.CSSProperties}>
                  <div className="room-emblem">{activeRoom.icon}</div>
                  <div className="eyebrow">{activeRoom.department.toUpperCase()} DIVISION</div>
                  <h2>{activeRoom.name}</h2>
                  <p>{activeRoom.description}</p>
                </div>
                <div className="panel-divider" />
                <div className="section-heading"><span>ASSIGNED PERSONNEL</span><span>{activeRoom.crew.length.toString().padStart(2, "0")}</span></div>
                {activeRoom.crew.map((member) => <div className="person-row" key={member}><div className="person-icon"><Users size={14} /></div><span>{member}</span><span className="person-status">SLOT RESERVED</span></div>)}
                <div className="panel-divider" />
                <div className="section-heading"><span>DEPARTMENT STATUS</span><span className="status-neutral">OFFLINE</span></div>
                <div className="empty-state"><DoorOpen size={18} /><span>Backend not connected</span><small>Live tasks and agent activity arrive in a later phase.</small></div>
              </div>
            ) : (
              <div className="panel-content overview-panel">
                <div className="panel-topline"><span className="eyebrow">STATION DIRECTORY</span><span className="directory-count">10 ROOMS</span></div>
                <h2>Explore your<br /><span>headquarters.</span></h2>
                <p className="overview-copy">Select any department on the map to inspect its purpose and assigned personnel.</p>
                <div className="panel-divider" />
                <div className="section-heading"><span>ALL DEPARTMENTS</span><span>10 / 10</span></div>
                <div className="room-list">
                  {rooms.map((room) => <button key={room.id} className="room-list-item" onClick={() => focusRoom(room.id)}><span className="room-list-dot" style={{ background: room.color }} /><span>{room.name}</span><ChevronRight size={14} /></button>)}
                </div>
                <div className="map-tip"><CircleHelp size={15} /><span>TIP: CLICK A CHARACTER TO VIEW ITS PERSONNEL FILE.</span></div>
              </div>
            )}
          </aside>
        </div>

        <footer className="bottom-status">
          <div><span className="status-square" /> <strong>LOCAL WORLD VIEW</strong><span className="footer-muted">· VISUAL FOUNDATION</span></div>
          <div className="footer-right"><span>BUILD 0.1.0</span><span>•</span><span>PHASE 01</span><span>•</span><span>© AI HQ</span></div>
        </footer>
      </section>

      <div className="dynamic-notch">
        <div className="notch-camera" />
        <span className="notch-mark"><span /></span>
        <span className="notch-title">AI HQ</span>
        <span className="notch-divider" />
        <span className="notch-state"><i /> WORLD PREVIEW</span>
        <ChevronDown size={13} className="notch-chevron" />
      </div>
      {feedOpen && <button className="feed-toggle" onClick={() => setFeedOpen(false)}><Activity size={14} /> WORLD LOG <span>PREVIEW ONLY</span><X size={13} /></button>}
    </main>
  );
}

export default App;