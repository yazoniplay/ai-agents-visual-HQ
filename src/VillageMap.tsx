import type { MouseEvent } from "react";

type VillageRoom = {
  id: string; name: string; x: number; y: number; w: number; h: number;
  color: string; department: string; crew: string[];
};
type VillageAgent = {
  name: string; role: string; room: string; color: string;
  status?: string; currentTask?: string;
  position?: { x: number; y: number };
};
type LiveAgent = {
  name: string; departmentId: string; status: string;
  currentTask?: string; position?: { x: number; y: number };
};
type Props = {
  rooms: VillageRoom[];
  agents: VillageAgent[];
  liveAgents: LiveAgent[];
  selectedRoom: string | null;
  selectedAgent: string | null;
  showLabels: boolean;
  search: string;
  onOpenRoom: (id: string) => void;
  onInspectAgent: (name: string) => void;
};

function PixelTree({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`} shapeRendering="crispEdges">
    <ellipse cx="1" cy="29" rx="22" ry="7" fill="#315638" opacity=".28" />
    <rect x="-5" y="8" width="12" height="26" fill="#765035" stroke="#563c2c" strokeWidth="2" />
    <rect x="-22" y="-7" width="43" height="30" fill="#376b3d" stroke="#2c5936" strokeWidth="3" />
    <rect x="-16" y="-16" width="32" height="27" fill="#4d8849" stroke="#376b3d" strokeWidth="2" />
    <rect x="-11" y="-12" width="8" height="6" fill="#83b963" />
    <rect x="7" y="-1" width="7" height="6" fill="#6da552" />
    <rect x="-23" y="5" width="8" height="7" fill="#5b984e" />
  </g>;
}

function Lamp({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges">
    <ellipse cx="0" cy="25" rx="9" ry="3" fill="#36583a" opacity=".35" />
    <rect x="-3" y="-3" width="6" height="29" fill="#51483b" />
    <rect x="-9" y="-14" width="18" height="15" fill="#5d5140" stroke="#3f3a31" strokeWidth="2" />
    <rect x="-5" y="-10" width="10" height="8" fill="#f5d77c" stroke="#b28a47" strokeWidth="2" />
    <path d="M-12 -15H12" stroke="#4e4437" strokeWidth="3" />
    <circle cx="0" cy="-6" r="13" fill="#ffe7a1" opacity=".12" />
  </g>;
}

function Bench({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`} shapeRendering="crispEdges">
    <rect x="-19" y="-8" width="38" height="8" fill="#a96f43" stroke="#70492f" strokeWidth="2" />
    <rect x="-19" y="2" width="38" height="6" fill="#bd8250" stroke="#70492f" strokeWidth="2" />
    <rect x="-14" y="8" width="5" height="9" fill="#60452f" /><rect x="10" y="8" width="5" height="9" fill="#60452f" />
  </g>;
}

function AgentSprite({ agent, x, y, status, selected, onClick }: {
  agent: VillageAgent; x: number; y: number; status: string; selected: boolean; onClick: () => void;
}) {
  const working = status === "working" || status === "meeting";
  return <g className={`village-agent ${working ? "is-working" : ""} ${selected ? "is-selected" : ""}`} transform={`translate(${x} ${y})`} onClick={(event: MouseEvent<SVGGElement>) => { event.stopPropagation(); onClick(); }} role="button" tabIndex={0} aria-label={`Inspect agent ${agent.name}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }}>
    <ellipse cx="0" cy="19" rx="12" ry="4" fill="#2e4d35" opacity=".4" />
    <g className="agent-body">
      <rect x="-8" y="-10" width="16" height="18" fill={agent.color} stroke="#4a4437" strokeWidth="2" />
      <rect x="-9" y="-17" width="18" height="11" fill="#eac79a" stroke="#594b3c" strokeWidth="2" />
      <rect x="-8" y="-20" width="16" height="5" fill="#594437" />
      <rect x="-5" y="-13" width="3" height="3" fill="#302e2a" /><rect x="3" y="-13" width="3" height="3" fill="#302e2a" />
      <rect x="-8" y="7" width="6" height="9" fill="#51463b" /><rect x="2" y="7" width="6" height="9" fill="#51463b" />
      <rect x="-12" y="-7" width="4" height="10" fill="#eac79a" /><rect x="8" y="-7" width="4" height="10" fill="#eac79a" />
    </g>
    <g className="agent-nameplate">
      <rect x="-34" y="-39" width="68" height="13" rx="2" fill="#473b2d" stroke="#e8d5a8" strokeWidth="1.5" />
      <text x="0" y="-30" textAnchor="middle">{agent.name}</text>
    </g>
    {working && <circle cx="13" cy="-17" r="4" fill="#f4d36f" stroke="#594b3c" strokeWidth="1" />}
    {selected && <rect x="-17" y="-43" width="34" height="65" rx="4" fill="none" stroke="#fff0a8" strokeWidth="2" strokeDasharray="3 3" />}
  </g>;
}

function VillageMap({ rooms, agents, liveAgents, selectedRoom, selectedAgent, showLabels, search, onOpenRoom, onInspectAgent }: Props) {
  const room = (id: string) => rooms.find((item) => item.id === id);
  const dimmed = (id: string) => !!search && !room(id)?.name.toLowerCase().includes(search.toLowerCase());
  const buildingLabel = (id: string, x: number, y: number, width: number) => {
    const item = room(id);
    return showLabels && item ? <g className="building-label" transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y="-12" width={width} height="19" rx="3" fill="#f4e5bd" stroke="#856b48" strokeWidth="2" />
      <text x="0" y="1" textAnchor="middle">{item.name.toUpperCase()}</text>
    </g> : null;
  };
  const click = (id: string) => () => onOpenRoom(id);
  const agentPositions: Record<string, { x: number; y: number }> = {
    revenue: { x: 330, y: 250 }, executive: { x: 690, y: 290 }, marketing: { x: 1110, y: 300 },
    research: { x: 1015, y: 535 }, meeting: { x: 1170, y: 795 }, development: { x: 405, y: 815 },
  };
  return <svg viewBox="0 0 1400 900" role="img" aria-label="A living pixel-art village for managing AI business agents">
    <defs>
      <pattern id="village-grass" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#82b965"/><rect x="4" y="6" width="3" height="3" fill="#9bcf79"/><rect x="20" y="15" width="4" height="3" fill="#6fa453"/><path d="M12 28l3-3m12-19l2-2" stroke="#a6d47e" strokeWidth="2"/></pattern>
      <pattern id="village-dirt" width="28" height="24" patternUnits="userSpaceOnUse"><rect width="28" height="24" fill="#bd8b55"/><path d="M2 5h8m8 12h8M5 22l3-4" stroke="#a87546" strokeWidth="2"/><rect x="17" y="3" width="3" height="3" fill="#d4a46a"/></pattern>
      <pattern id="village-stone" width="26" height="20" patternUnits="userSpaceOnUse"><rect width="26" height="20" fill="#d6c69d"/><path d="M0 1H26M0 19H26M8 1V10M20 10V19" stroke="#b3a27d" strokeWidth="1.5"/></pattern>
      <pattern id="village-water" width="36" height="24" patternUnits="userSpaceOnUse"><rect width="36" height="24" fill="#4c9cae"/><path d="M4 7h12m8 11h9M17 2h7" stroke="#a4d9d8" strokeWidth="2" opacity=".8"/></pattern>
      <pattern id="brick" width="20" height="12" patternUnits="userSpaceOnUse"><rect width="20" height="12" fill="#a64f3f"/><path d="M0 0H20M0 6H20M10 0V6M3 6V12" stroke="#753b34" strokeWidth="1.5"/></pattern>
      <pattern id="roof" width="18" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H18M0 6H18M9 0V6M0 6V12" stroke="#f1c1a1" strokeOpacity=".25" strokeWidth="2"/></pattern>
      <filter id="building-shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect width="1400" height="900" fill="url(#village-grass)" />
    <path d="M0 0H1400V900H0Z" fill="none" stroke="#588c4d" strokeWidth="20" />
    <path d="M0 310C170 280 250 320 365 300S560 265 680 310S860 340 970 300S1180 260 1400 300" fill="none" stroke="#9d7045" strokeWidth="82" />
    <path d="M0 310C170 280 250 320 365 300S560 265 680 310S860 340 970 300S1180 260 1400 300" fill="none" stroke="url(#village-dirt)" strokeWidth="72" />
    <path d="M0 565C160 535 270 570 380 555S590 515 690 560S910 615 1040 565S1240 510 1400 535" fill="none" stroke="#9d7045" strokeWidth="62" />
    <path d="M0 565C160 535 270 570 380 555S590 515 690 560S910 615 1040 565S1240 510 1400 535" fill="none" stroke="url(#village-dirt)" strokeWidth="52" />
    <path d="M450 0C440 140 480 205 510 285S500 470 460 560S430 735 470 900M880 0C900 145 870 220 840 300S900 450 970 535S1030 730 1000 900" fill="none" stroke="#9d7045" strokeWidth="50" />
    <path d="M450 0C440 140 480 205 510 285S500 470 460 560S430 735 470 900M880 0C900 145 870 220 840 300S900 450 970 535S1030 730 1000 900" fill="none" stroke="url(#village-stone)" strokeWidth="40" />
    <path d="M0 420C140 390 260 420 360 450S530 490 650 465S850 410 980 440S1190 480 1400 455" fill="none" stroke="#9d7045" strokeWidth="35" />
    <path d="M0 420C140 390 260 420 360 450S530 490 650 465S850 410 980 440S1190 480 1400 455" fill="none" stroke="url(#village-stone)" strokeWidth="27" />
    <g className="pond-scene">
      <ellipse cx="610" cy="445" rx="260" ry="155" fill="#426b4b" opacity=".3" />
      <ellipse cx="610" cy="430" rx="250" ry="145" fill="#397f91" stroke="#e1c38a" strokeWidth="13" />
      <ellipse cx="610" cy="430" rx="238" ry="133" fill="url(#village-water)" stroke="#6bb9bd" strokeWidth="4" />
      <path d="M405 420q35-17 72 0t72 0M690 390q32-16 65 0t65 0M520 485q28-12 58 0t58 0" fill="none" stroke="#c2e5d4" strokeWidth="4" opacity=".6" />
      <g className="lily-pad"><ellipse cx="450" cy="380" rx="24" ry="11" fill="#4e8c4f" stroke="#315f3c" strokeWidth="3"/><path d="M450 380l11-8" stroke="#c0d78b" strokeWidth="2"/><ellipse cx="760" cy="470" rx="27" ry="12" fill="#4e8c4f" stroke="#315f3c" strokeWidth="3"/><path d="M760 470l13-8" stroke="#c0d78b" strokeWidth="2"/><ellipse cx="570" cy="535" rx="20" ry="9" fill="#4e8c4f" stroke="#315f3c" strokeWidth="3"/></g>
      <g className="rowboat" transform="translate(650 435) rotate(-9)"><path d="M-42 -8H42L28 18H-28Z" fill="#b34c37" stroke="#673d31" strokeWidth="4"/><path d="M-34 -4H34" stroke="#e8a06a" strokeWidth="4"/><rect x="-8" y="-15" width="16" height="12" fill="#8b6545" stroke="#553c2e" strokeWidth="2"/><path d="M-50 10L-31 -15M50 10L31 -15" stroke="#e2c58c" strokeWidth="3"/></g>
      <g className="pink-birds"><g transform="translate(490 465)"><path d="M0 12q-8-18 3-27q8-6 9 4q-2 8-8 8" fill="none" stroke="#e98e9c" strokeWidth="6"/><ellipse cx="-2" cy="12" rx="13" ry="8" fill="#f2a2ad"/><path d="M-9 17v10m8-10v10" stroke="#9a6553" strokeWidth="2"/><path d="M8 -12l8 2-8 3" fill="#d28a4f"/></g><g transform="translate(785 405) scale(.8)"><path d="M0 12q-8-18 3-27q8-6 9 4q-2 8-8 8" fill="none" stroke="#e98e9c" strokeWidth="6"/><ellipse cx="-2" cy="12" rx="13" ry="8" fill="#f2a2ad"/><path d="M-9 17v10m8-10v10" stroke="#9a6553" strokeWidth="2"/><path d="M8 -12l8 2-8 3" fill="#d28a4f"/></g></g>
    </g>
    <g className="wooden-bridge" shapeRendering="crispEdges">
      <rect x="510" y="414" width="205" height="37" fill="#805639" stroke="#563e2d" strokeWidth="5"/>
      <path d="M518 420H708M518 430H708M518 440H708" stroke="#d5a56b" strokeWidth="4"/>
      {Array.from({ length: 10 }, (_, index) => <path key={index} d={`M${523 + index * 20} 416v34`} stroke="#684832" strokeWidth="2" />)}
      <path d="M510 412H715M510 453H715" stroke="#e2bd83" strokeWidth="6"/>
      <path d="M520 410v-10m185 10v-10" stroke="#6c4a31" strokeWidth="5"/>
    </g>
    <g className="fountain" transform="translate(865 465)" shapeRendering="crispEdges">
      <ellipse cx="0" cy="22" rx="38" ry="11" fill="#6e5c43" opacity=".25"/>
      <ellipse cx="0" cy="8" rx="36" ry="14" fill="#79c6cf" stroke="#f0dfb1" strokeWidth="5"/>
      <ellipse cx="0" cy="3" rx="22" ry="8" fill="#4b9eb1" stroke="#6a8c91" strokeWidth="3"/>
      <rect x="-6" y="-30" width="12" height="32" fill="#88c5cf" stroke="#557f8a" strokeWidth="3"/>
      <path d="M0 -31Q-24 -47 -28 -29Q-13 -22 0 -31Q14 -48 28 -29Q13 -22 0 -31" fill="#8ed2d8" stroke="#4f8792" strokeWidth="3"/>
      <path d="M0 -28v-17" stroke="#a6e4e2" strokeWidth="4"/><circle cx="0" cy="-47" r="5" fill="#d7f3e9"/>
    </g>
    <g className="park-furniture"><Bench x={385} y={390} rotate={-12}/><Bench x={820} y={585} rotate={12}/><Bench x={660} y={625}/><Lamp x={390} y={315}/><Lamp x={890} y={300}/><Lamp x={700} y={690}/><Lamp x={1080} y={455}/></g>
    <g className="flower-patches">{Array.from({ length: 34 }, (_, index) => { const x = 28 + ((index * 137) % 1330); const y = 25 + ((index * 83) % 840); return <g key={index} transform={`translate(${x} ${y})`}><rect x="-3" y="1" width="6" height="7" fill="#4f8845"/><rect x="-3" y="-4" width="6" height="6" fill={index % 3 === 0 ? "#e99aa9" : index % 3 === 1 ? "#f4d77d" : "#f3e6cf"}/></g>; })}</g>
    <g className="tree-clusters"><PixelTree x={30} y={40} size={1.3}/><PixelTree x={370} y={45} size={1.1}/><PixelTree x={420} y={135}/><PixelTree x={840} y={45} size={1.2}/><PixelTree x={1215} y={45} size={1.3}/><PixelTree x={1350} y={250}/><PixelTree x={1350} y={380}/><PixelTree x={1340} y={820} size={1.3}/><PixelTree x={920} y={835}/><PixelTree x={800} y={820}/><PixelTree x={30} y={850} size={1.4}/><PixelTree x={385} y={800}/><PixelTree x={30} y={470}/><PixelTree x={380} y={670}/><PixelTree x={1080} y={850}/><PixelTree x={1230} y={860}/><PixelTree x={1200} y={420}/></g>
    <g className="hedge-borders" fill="#3e7944" stroke="#2e6039" strokeWidth="4" shapeRendering="crispEdges">
      <rect x="28" y="350" width="125" height="24"/><rect x="1080" y="325" width="175" height="23"/><rect x="395" y="700" width="95" height="20"/><rect x="1025" y="820" width="155" height="20"/>
      <rect x="35" y="390" width="20" height="105"/><rect x="1260" y="370" width="22" height="105"/>
    </g>
    <g className="revenue-zone" onClick={click("revenue")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenRoom("revenue"); }} opacity={dimmed("revenue") ? .35 : 1}>
      <ellipse cx="185" cy="260" rx="145" ry="16" fill="#385c3b" opacity=".25" filter="url(#building-shadow)"/>
      <rect x="38" y="105" width="294" height="190" fill="#dfc98e" stroke="#7b6848" strokeWidth="6"/>
      <path d="M48 158L178 67L320 158Z" fill="#ad4938" stroke="#603d32" strokeWidth="6"/><path d="M48 158L178 67L320 158Z" fill="url(#roof)"/>
      <rect x="85" y="150" width="185" height="117" fill="#b64d3a" stroke="#693c31" strokeWidth="5"/>
      <path d="M85 150L178 91L270 150" fill="#8f3f35" stroke="#693c31" strokeWidth="5"/>
      <rect x="150" y="198" width="55" height="69" fill="#6c4735" stroke="#49362b" strokeWidth="4"/><path d="M177 198v69M150 231h55" stroke="#d6a56c" strokeWidth="4"/>
      <rect x="105" y="174" width="34" height="29" fill="#91c6c3" stroke="#66493a" strokeWidth="4"/><path d="M122 174v29M105 188h34" stroke="#f1e0b8" strokeWidth="3"/>
      <rect x="215" y="174" width="34" height="29" fill="#91c6c3" stroke="#66493a" strokeWidth="4"/><path d="M232 174v29M215 188h34" stroke="#f1e0b8" strokeWidth="3"/>
      <g className="animal-pens" fill="none" stroke="#e8d5a8" strokeWidth="5"><path d="M20 300V190H72M282 300V190H350M20 300H350"/><path d="M20 230H72M282 230H350M20 270H350"/></g>
      <g className="sheep" transform="translate(45 240)"><circle cx="0" cy="0" r="14" fill="#f0ead9" stroke="#897f6b" strokeWidth="3"/><circle cx="-9" cy="-8" r="7" fill="#fff8e8"/><circle cx="9" cy="-8" r="7" fill="#fff8e8"/><rect x="-4" y="-3" width="15" height="13" fill="#6d594c"/><rect x="-8" y="10" width="5" height="10" fill="#554536"/><rect x="7" y="10" width="5" height="10" fill="#554536"/></g>
      <g className="chicken" transform="translate(300 260)"><ellipse cx="0" cy="0" rx="13" ry="10" fill="#f3e5c4" stroke="#9d7c4e" strokeWidth="2"/><circle cx="9" cy="-8" r="7" fill="#f3e5c4"/><path d="M14 -8l8 3-8 3" fill="#dc8b4d"/><circle cx="11" cy="-10" r="1.5" fill="#382f27"/><path d="M-4 9v7m7-7v7" stroke="#a56b3f" strokeWidth="2"/></g>
      <g className="animal-pens" stroke="#f1e0b7" strokeWidth="4"><path d="M22 215h48m-48 38h48m-48 38h48M280 215h70m-70 38h70m-70 38h70"/></g>
      {buildingLabel("revenue", 185, 324, 218)}
      <rect x="30" y="70" width="320" height="265" fill="transparent" stroke="transparent"/>
      <title>Revenue Bay & Pastures — open revenue and finance operations</title>
    </g>
    <g className="command-zone" onClick={click("executive")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenRoom("executive"); }} opacity={dimmed("executive") ? .35 : 1}>
      <ellipse cx="680" cy="255" rx="180" ry="22" fill="#385c3b" opacity=".25" filter="url(#building-shadow)"/>
      <rect x="550" y="140" width="260" height="112" fill="url(#brick)" stroke="#65382f" strokeWidth="6"/>
      <rect x="575" y="92" width="210" height="66" fill="#ad5b45" stroke="#693b31" strokeWidth="5"/>
      <path d="M535 148L680 48L825 148Z" fill="#563a35" stroke="#382e2c" strokeWidth="7"/><path d="M535 148L680 48L825 148Z" fill="url(#roof)"/>
      <path d="M590 95L680 33L770 95" fill="#78443b" stroke="#382e2c" strokeWidth="5"/>
      <rect x="650" y="175" width="60" height="77" fill="#76503b" stroke="#47362e" strokeWidth="5"/><path d="M680 175v77" stroke="#d5a36b" strokeWidth="4"/>
      <g fill="#8dc4c5" stroke="#573f36" strokeWidth="4"><rect x="570" y="177" width="35" height="38"/><rect x="625" y="110" width="30" height="30"/><rect x="705" y="110" width="30" height="30"/><rect x="755" y="177" width="35" height="38"/></g>
      <g stroke="#e5c48a" strokeWidth="3"><path d="M587 177v38m-17-19h35M640 110v30m-15-15h30M720 110v30m-15-15h30M772 177v38m-17-19h35"/></g>
      <rect x="660" y="67" width="40" height="35" fill="#8b493c" stroke="#4c342e" strokeWidth="4"/><path d="M680 67v35" stroke="#d4a36c" strokeWidth="3"/>
      {buildingLabel("executive", 680, 282, 210)}
      <rect x="525" y="35" width="310" height="260" fill="transparent" stroke="transparent"/>
      <title>Command Center — open budget, agent state and approval queue</title>
    </g>
    <g className="media-zone" onClick={click("marketing")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenRoom("marketing"); }} opacity={dimmed("marketing") ? .35 : 1}>
      <ellipse cx="1060" cy="270" rx="110" ry="15" fill="#385c3b" opacity=".25" filter="url(#building-shadow)"/>
      <rect x="1000" y="150" width="120" height="115" fill="#b54f3c" stroke="#653a31" strokeWidth="5"/>
      <path d="M995 155L1060 90L1125 155Z" fill="#6b3935" stroke="#412f2d" strokeWidth="5"/><path d="M995 155L1060 90L1125 155Z" fill="url(#roof)"/>
      <rect x="1020" y="177" width="80" height="88" fill="#a64b3b" stroke="#713d32" strokeWidth="3"/>
      <rect x="1038" y="187" width="44" height="37" fill="#92c4c0" stroke="#59443a" strokeWidth="4"/>
      <path d="M1060 187v37m-22-18h44" stroke="#f2dfbd" strokeWidth="3"/>
      <circle cx="1060" cy="90" r="12" fill="#e6c58a" stroke="#6d4537" strokeWidth="4"/>
      <g className="windmill-blades" transform="translate(1060 90)"><path d="M0 0L-9 -83L9 -83Z" fill="#e8e0c7" stroke="#77533d" strokeWidth="3"/><path d="M0 0L83 -9L83 9Z" fill="#e8e0c7" stroke="#77533d" strokeWidth="3"/><path d="M0 0L9 83L-9 83Z" fill="#e8e0c7" stroke="#77533d" strokeWidth="3"/><path d="M0 0L-83 9L-83 -9Z" fill="#e8e0c7" stroke="#77533d" strokeWidth="3"/></g>
      {buildingLabel("marketing", 1060, 290, 170)}
      <rect x="950" y="45" width="220" height="260" fill="transparent" stroke="transparent"/>
      <title>Media Studio — open content and campaign operations</title>
    </g>
    <g className="research-zone" transform="translate(70 0)" onClick={click("research")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenRoom("research"); }} opacity={dimmed("research") ? .35 : 1}>
      <ellipse cx="875" cy="555" rx="130" ry="15" fill="#385c3b" opacity=".25" filter="url(#building-shadow)"/>
      <rect x="785" y="425" width="185" height="118" fill="#d8d0b1" stroke="#4c6f68" strokeWidth="5"/>
      <path d="M770 430L840 350L995 430Z" fill="#2f7474" stroke="#28565a" strokeWidth="5"/>
      <path d="M785 425L840 365L980 425" fill="#9ac8bf" stroke="#3c7775" strokeWidth="4"/>
      <path d="M810 417L850 373L850 425M865 425L900 382L900 425M915 425L950 401L950 425" fill="none" stroke="#e4f0d8" strokeWidth="4"/>
      <rect x="805" y="452" width="45" height="53" fill="#76b7b6" stroke="#4d7771" strokeWidth="4"/><rect x="865" y="452" width="45" height="53" fill="#76b7b6" stroke="#4d7771" strokeWidth="4"/><rect x="925" y="452" width="25" height="91" fill="#80563c" stroke="#4c3b30" strokeWidth="4"/>
      <path d="M805 478h45m-22-26v53m37-27h45m-22-26v53" stroke="#e3efdb" strokeWidth="3"/>
      {buildingLabel("research", 875, 570, 170)}
      <rect x="760" y="340" width="245" height="245" fill="transparent" stroke="transparent"/>
      <title>Research Lab — open idea validation and research logs</title>
    </g>
    <g className="war-zone" onClick={click("meeting")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenRoom("meeting"); }} opacity={dimmed("meeting") ? .35 : 1}>
      <ellipse cx="1225" cy="780" rx="115" ry="16" fill="#385c3b" opacity=".25" filter="url(#building-shadow)"/>
      <rect x="1145" y="665" width="160" height="110" fill="url(#brick)" stroke="#673c32" strokeWidth="5"/>
      <path d="M1130 675L1225 535L1320 675Z" fill="#5a3936" stroke="#3d2e2c" strokeWidth="6"/><path d="M1130 675L1225 535L1320 675Z" fill="url(#roof)"/>
      <path d="M1185 620V570Q1225 535 1265 570V620" fill="#8a4c40" stroke="#4b3430" strokeWidth="4"/>
      <rect x="1205" y="700" width="40" height="75" fill="#654534" stroke="#42352d" strokeWidth="4"/>
      <path d="M1225 700v75" stroke="#d9ae75" strokeWidth="3"/>
      <rect x="1160" y="695" width="25" height="30" fill="#83b9b7" stroke="#513d34" strokeWidth="3"/><rect x="1265" y="695" width="25" height="30" fill="#83b9b7" stroke="#513d34" strokeWidth="3"/>
      {buildingLabel("meeting", 1225, 805, 145)}
      <rect x="1105" y="520" width="240" height="300" fill="transparent" stroke="transparent"/>
      <title>War Room — open agent syncs and meetings</title>
    </g>
    <g className="factory-zone" onClick={click("development")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenRoom("development"); }} opacity={dimmed("development") ? .35 : 1}>
      <ellipse cx="230" cy="815" rx="150" ry="17" fill="#385c3b" opacity=".25" filter="url(#building-shadow)"/>
      <rect x="125" y="690" width="205" height="120" fill="#b94b3a" stroke="#67392f" strokeWidth="5"/>
      <path d="M112 700L225 610L343 700Z" fill="#713d35" stroke="#452f2c" strokeWidth="6"/><path d="M112 700L225 610L343 700Z" fill="url(#roof)"/>
      <rect x="205" y="730" width="43" height="80" fill="#6c4735" stroke="#49362b" strokeWidth="4"/><path d="M226 730v80M205 768h43" stroke="#d6a56c" strokeWidth="4"/>
      <rect x="145" y="720" width="40" height="34" fill="#8dbdb7" stroke="#624238" strokeWidth="4"/><path d="M165 720v34m-20-17h40" stroke="#e9ddbd" strokeWidth="3"/>
      <g className="craft-tables"><rect x="45" y="745" width="54" height="15" fill="#a66d42" stroke="#64462f" strokeWidth="3"/><path d="M50 760v20m43-20v20" stroke="#65452f" strokeWidth="4"/><rect x="355" y="735" width="50" height="15" fill="#a66d42" stroke="#64462f" strokeWidth="3"/><path d="M360 750v24m40-24v24" stroke="#65452f" strokeWidth="4"/></g>
      <g className="anvil" transform="translate(75 710)"><path d="M-18 0H18L12 10H-12Z" fill="#596b70" stroke="#343f43" strokeWidth="3"/><rect x="-8" y="10" width="16" height="12" fill="#5d6d71"/><rect x="-18" y="22" width="36" height="6" fill="#8a6345"/></g>
      <g className="tools"><path d="M370 680l18-18m-23 13l10 10" stroke="#5b4634" strokeWidth="6"/><rect x="382" y="662" width="12" height="6" fill="#9b9b8d"/></g>
      {buildingLabel("development", 230, 835, 120)}
      <rect x="90" y="600" width="330" height="250" fill="transparent" stroke="transparent"/>
      <title>Factory — open product execution and production pipelines</title>
    </g>
    <g className="yard-details"><path d="M370 190h90m-90 12h90" stroke="#e9d7a8" strokeWidth="5"/><rect x="400" y="165" width="45" height="25" fill="#a7c9ad" stroke="#5c774c" strokeWidth="3"/><path d="M410 165v25m12-25v25m12-25v25" stroke="#5b814e" strokeWidth="3"/><circle cx="458" cy="205" r="8" fill="#f2d17b"/><circle cx="475" cy="205" r="8" fill="#e79ca7"/></g>
    <g className="building-hitboxes">
      <rect x="30" y="60" width="330" height="285" fill="transparent" onClick={click("revenue")} />
      <rect x="520" y="30" width="330" height="270" fill="transparent" onClick={click("executive")} />
      <rect x="940" y="40" width="250" height="280" fill="transparent" onClick={click("marketing")} />
      <rect x="750" y="330" width="265" height="270" fill="transparent" onClick={click("research")} />
      <rect x="1095" y="515" width="255" height="310" fill="transparent" onClick={click("meeting")} />
      <rect x="85" y="595" width="340" height="260" fill="transparent" onClick={click("development")} />
    </g>
    {agents.map((agent, index) => {
      const live = liveAgents.find((item) => item.name.toLowerCase() === agent.name.toLowerCase());
      const base = agentPositions[agent.room] ?? { x: 700, y: 700 };
      const sameRoom = agents.filter((item) => item.room === agent.room);
      const offset = sameRoom.findIndex((item) => item.name === agent.name);
      const x = live?.position?.x ?? base.x + (offset - (sameRoom.length - 1) / 2) * 34;
      const y = live?.position?.y ?? base.y + (index % 2) * 9;
      return <AgentSprite key={agent.name} agent={agent} x={x} y={y} status={live?.status ?? "idle"} selected={selectedAgent === agent.name} onClick={() => onInspectAgent(agent.name)} />;
    })}
    <g className="map-wayfinding"><rect x="590" y="740" width="180" height="27" rx="3" fill="#f4e5bd" stroke="#856b48" strokeWidth="2"/><text x="680" y="758" textAnchor="middle">GREENFIELD VILLAGE</text></g>
  </svg>;
}

export default VillageMap;
