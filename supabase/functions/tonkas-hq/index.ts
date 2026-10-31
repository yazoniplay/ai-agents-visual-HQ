type DbOptions = {method?: string; body?: unknown; prefer?: string};
type ProviderState = {ashnaai:boolean; gemini:boolean; groq:boolean; ollama:boolean; default:string; lightweight:string; matt_model:string; [key:string]: boolean|string};
const SUPABASE_URL=(Deno.env.get("SUPABASE_URL")||"").replace(/\/$/,"");
const SECRET_MAP=(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}")}catch{return {}}})();
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||SECRET_MAP.default||Object.values(SECRET_MAP)[0]||"";
const AGENTS=[
{id:"matt",name:"Matt",role:"CEO & Chief of Staff",department:"command",objective:"Own the portfolio across HookEngine and Venture Studio. Prioritize HookEngine by default, allocate specialist capacity, set measurable outcomes, review deliverables, prevent duplicate tasks, and escalate owner decisions. Never assign work to SMP OPS KIT."},
{id:"dennis",name:"Dennis",role:"Research Lead",department:"research",objective:"For Venture Studio, discover and screen new online business opportunities. Assess problem frequency, buyer clarity, urgency, willingness-to-pay evidence, distribution, startup cost and unit economics. Separate verified evidence from assumptions; never invent live research."},
{id:"finn",name:"Finn",role:"Sales & Orders",department:"factory",objective:"For HookEngine, design ethical sales workflows, lead qualification, onboarding and customer-response drafts. Do not contact customers, send messages, accept orders or make promises; prepare work for owner approval."},
{id:"bunc",name:"Bunc",role:"Product Operations",department:"factory",objective:"For HookEngine, convert approved product priorities into precise specifications, user flows, implementation tickets, release plans and measurable acceptance criteria. Do not claim implementation without repository access."},
{id:"maverick",name:"Maverick",role:"Marketing Lead",department:"media",objective:"For HookEngine and approved ventures, create positioning, organic content strategies, campaign calendars and polished draft copy. Prioritize useful proof over hype. Never publish or claim reach/results without evidence."},
{id:"pham",name:"Pham",role:"Finance & Revenue",department:"revenue",objective:"For HookEngine and the portfolio, model pricing hypotheses, API cost exposure, gross margins, budgets and financial risks. Label missing data; never invent revenue or costs and never move money."},
{id:"luke",name:"Luke",role:"Engineering Lead",department:"factory",objective:"For HookEngine, produce technical plans, architecture reviews, security checklists, test plans and release criteria. Clearly distinguish proposed tests from tests actually run; do not claim repository access."},
{id:"trevor",name:"Trevor",role:"Quality & Risk",department:"war",objective:"Independently review HookEngine and Venture Studio deliverables for accuracy, completeness, security, policy, evidence quality and acceptance criteria. Return specific defects and a pass/fail recommendation; do not claim tests were executed."},
{id:"ivy",name:"Ivy",role:"Customer Research",department:"research",objective:"For HookEngine, analyze only supplied customer feedback and clearly labeled hypotheses. Identify recurring pains, objections, feature requests and churn risks. Never fabricate interviews, reviews or customer quotes."},
{id:"noah",name:"Noah",role:"Operations Analyst",department:"command",objective:"Monitor portfolio task throughput, cycle time, blockers, agent workload, approval queues and measurable business outcomes. Report unavailable metrics honestly and recommend resource allocation across HookEngine and Venture Studio."}
];
const AGENT_IDS=new Set(AGENTS.map(a=>a.id));
const cors={"Access-Control-Allow-Origin":"https://yazoniplay.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-hq-admin-token, x-tonkas-cron-token","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(data:unknown,status:number=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const now=()=>new Date().toISOString();
function providers():ProviderState{return {ashnaai:false,gemini:!!Deno.env.get("GEMINI_API_KEY"),groq:false,ollama:false,default:"gemini",lightweight:"gemini",matt_model:"gemini-3.5-flash-lite"};}
function headers(prefer?:string):Record<string,string>{if(!SUPABASE_URL||!SERVICE_KEY)throw new Error("Supabase server credentials are missing.");const h:Record<string,string>={"apikey":SERVICE_KEY,"Authorization":"Bearer "+SERVICE_KEY,"Content-Type":"application/json"};if(prefer)h.Prefer=prefer;return h;}
async function db(path:string,opt:DbOptions={}):Promise<any>{const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{method:opt.method||"GET",headers:headers(opt.prefer),body:opt.body===undefined?undefined:JSON.stringify(opt.body),signal:AbortSignal.timeout(20000)});const t=await r.text();if(!r.ok)throw new Error("Database "+r.status+": "+t.slice(0,400));if(!t)return null;try{return JSON.parse(t)}catch{return t}}
async function verify(token:string|null,name:string):Promise<boolean>{if(!token)return false;return await db("rpc/tonkas_verify_secret",{method:"POST",body:{p_token:token,p_secret_name:name}})===true;}
async function setting(key:string,fallback=""):Promise<string>{const a=await db("tonkas_settings?select=value&key=eq."+encodeURIComponent(key)+"&limit=1");return a.length?a[0].value:fallback;}
async function setSetting(key:string,value:string):Promise<void>{await db("tonkas_settings?on_conflict=key",{method:"POST",body:{key,value:String(value),updated_at:now()},prefer:"resolution=merge-duplicates,return=minimal"});}
async function log(kind:string,actor:string,message:string,metadata:Record<string,unknown>={}):Promise<void>{await db("tonkas_activity",{method:"POST",body:{kind,actor,message,metadata,created_at:now()},prefer:"return=minimal"});}
const HOME_POINTS:Record<string,{x:number;y:number}>={command:{x:0.493,y:0.322},revenue:{x:0.236,y:0.278},media:{x:0.793,y:0.333},research:{x:0.725,y:0.594},war:{x:0.836,y:0.883},factory:{x:0.289,y:0.906}};
const MEETING_POINT={x:0.86,y:0.82};
async function setAgentState(agentId:string,status:string,point?:{x:number;y:number},currentTask?:string|null):Promise<void>{
 const body:Record<string,unknown>={status,updated_at:now()};
 if(point){body.x=point.x;body.y=point.y;}
 if(currentTask!==undefined)body.current_task=currentTask;
 await db("tonkas_agents?id=eq."+encodeURIComponent(agentId),{method:"PATCH",body,prefer:"return=minimal"});
}
async function message(room:string,sender:string,content:string,to:string|null=null):Promise<void>{
 await db("tonkas_messages",{method:"POST",body:{room,sender_id:sender,recipient_id:to,content:String(content).slice(0,10000)},prefer:"return=minimal"});
 await log("message",sender,"New message in "+room,{recipient:to});
 if(sender!=="owner"&&to&&(to==="all"||AGENT_IDS.has(sender)||AGENT_IDS.has(String(to)))){
  const participants=new Set<string>();
  if(AGENT_IDS.has(sender))participants.add(sender);
  if(to==="all")for(const agent of AGENTS)participants.add(agent.id);
  else if(to&&AGENT_IDS.has(to))participants.add(to);
  await Promise.all([...participants].map(id=>setAgentState(id,"meeting",MEETING_POINT)));
 }
}
async function addTask(title:string,description:string,agent:string|null,creator:string,priority:string="normal",department:string|null=null):Promise<string>{const rows=await db("tonkas_tasks",{method:"POST",body:{title:String(title).slice(0,180),description:String(description).slice(0,10000),assigned_to:agent,created_by:creator,status:"queued",priority:["high","normal","low"].includes(priority)?priority:"normal",department,created_at:now(),updated_at:now()},prefer:"return=representation"});const task=rows&&rows[0];if(!task)throw new Error("Task insert returned no row.");if(agent)await db("tonkas_agents?id=eq."+encodeURIComponent(agent),{method:"PATCH",body:{status:"queued",current_task:task.id,updated_at:now()},prefer:"return=minimal"});await log("task.created",creator,"Created task: "+title,{task_id:task.id,agent});return task.id;}
async function addApproval(title:string,context:string,recommended:string,options:any[],actor:string):Promise<void>{if(!Array.isArray(options)||options.length!==5)throw new Error("Exactly five options are required.");await db("tonkas_approvals",{method:"POST",body:{title:String(title).slice(0,180),context:String(context).slice(0,10000),recommended_option:String(recommended||""),options,status:"pending",created_by:actor,created_at:now()},prefer:"return=minimal"});await log("approval.created",actor,"Decision needed: "+title,{});}
async function snapshot():Promise<any>{const r=await Promise.all([db("tonkas_agents?select=*&order=name.asc"),db("tonkas_tasks?select=*&order=created_at.desc&limit=100"),db("tonkas_approvals?select=*&status=eq.pending&order=created_at.desc"),db("tonkas_messages?select=*&order=created_at.desc&limit=100"),db("tonkas_activity?select=*&order=created_at.desc&limit=100")]);const agents=r[0]||[],tasks=r[1]||[],approvals=r[2]||[],messages=(r[3]||[]).reverse(),activity=(r[4]||[]).reverse();return {ok:true,runtime:"live",autonomy_enabled:(await setting("autonomy_enabled","false"))==="true",provider_status:providers(),company_goal:await setting("company_goal",""),agents,tasks,approvals,messages,activity,server_time:now(),counts:{agents:agents.length,active_agents:agents.filter((a:any)=>["working","planning","reviewing"].includes(a.status)).length,queued_tasks:tasks.filter((t:any)=>t.status==="queued").length,running_tasks:tasks.filter((t:any)=>t.status==="running").length,pending_approvals:approvals.length}};}
function parse(raw:string):any{
 let s=String(raw||"").trim();
 const fence=String.fromCharCode(96).repeat(3);
 if(s.startsWith(fence)){
  s=s.slice(fence.length);
  const n=s.indexOf("\n");
  if(n>=0)s=s.slice(n+1);
  const e=s.lastIndexOf(fence);
  if(e>=0)s=s.slice(0,e);
 }
 const a=s.indexOf("{"),b=s.lastIndexOf("}");
 if(a<0||b<a)throw new Error("Model did not return a JSON object.");
 s=s.slice(a,b+1);
 try{return JSON.parse(s);}catch(firstError){
  let repaired="",inString=false,escaped=false;
  for(let i=0;i<s.length;i++){
   const c=s[i];
   if(!inString){repaired+=c;if(c==='"')inString=true;continue;}
   if(escaped){
    if(c==="u"){
     const hex=s.slice(i+1,i+5);
     if(/^[0-9a-fA-F]{4}$/.test(hex)){repaired+="u"+hex;i+=4;}
     else{repaired+="\\\\u";}
    }else if('"\\/bfnrt'.includes(c)){repaired+=c;}
    else{repaired+="\\"+c;}
    escaped=false;
    continue;
   }
   if(c==="\\"){repaired+="\\";escaped=true;continue;}
   if(c==='"'){repaired+=c;inString=false;continue;}
   const code=c.charCodeAt(0);
   if(code<0x20){repaired+="\\u"+code.toString(16).padStart(4,"0");continue;}
   repaired+=c;
  }
  try{return JSON.parse(repaired);}
  catch(secondError){throw new Error("Model JSON parse failed after repair: "+String(secondError).slice(0,220));}
 }
}
async function runAgentTool(name:string,args:any):Promise<any>{
 const path=String(args?.path||"").replace(/^\/+/, "");
 if(path.split("/").some((part:string)=>part===".."||part==="."))throw new Error("Invalid repository path.");
 if(name==="github_list_files"){
  const suffix=path?"/"+path.split("/").map(encodeURIComponent).join("/"):"";
  const response=await fetch("https://api.github.com/repos/yazoniplay/HookEngine/contents"+suffix,{headers:{Accept:"application/vnd.github+json","User-Agent":"TonkasTownAgent"}});
  const body=await response.text();if(!response.ok)throw new Error("GitHub file listing returned "+response.status+": "+body.slice(0,240));
  const data=JSON.parse(body);const entries=Array.isArray(data)?data:[data];
  return entries.slice(0,150).map((item:any)=>({name:item.name,path:item.path,type:item.type,size:item.size||0}));
 }
 if(name==="github_read_file"){
  if(!path)throw new Error("A file path is required.");
  const url="https://raw.githubusercontent.com/yazoniplay/HookEngine/main/"+path.split("/").map(encodeURIComponent).join("/");
  const response=await fetch(url,{headers:{"User-Agent":"TonkasTownAgent"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error("GitHub file read returned "+response.status+" for "+path);
  const content=await response.text();
  return {repository:"yazoniplay/HookEngine",path,content:content.slice(0,28000),truncated:content.length>28000};
 }
 if(name==="github_recent_commits"){
  const response=await fetch("https://api.github.com/repos/yazoniplay/HookEngine/commits?per_page=8",{headers:{Accept:"application/vnd.github+json","User-Agent":"TonkasTownAgent"}});
  const body=await response.text();if(!response.ok)throw new Error("GitHub commits returned "+response.status+": "+body.slice(0,240));
  return JSON.parse(body).map((item:any)=>({sha:String(item.sha).slice(0,12),message:String(item.commit?.message||"").slice(0,300),date:item.commit?.author?.date||"",author:item.author?.login||item.commit?.author?.name||"unknown"}));
 }
 throw new Error("Tool is not available.");
}
const GITHUB_FUNCTIONS=[
 {name:"github_list_files",description:"List paths in the public yazoniplay/HookEngine repository. Read-only.",parameters:{type:"OBJECT",properties:{path:{type:"STRING",description:"Optional directory path, for example src or supabase/functions."}}}},
 {name:"github_read_file",description:"Read a text file from the public yazoniplay/HookEngine repository on main. Read-only; maximum 28 KB.",parameters:{type:"OBJECT",properties:{path:{type:"STRING",description:"Repository-relative file path."}},required:["path"]}},
 {name:"github_recent_commits",description:"Read the eight latest commits from yazoniplay/HookEngine. Read-only.",parameters:{type:"OBJECT",properties:{}}}
];
async function model(system:string,prompt:string,provider:string,modelOverride?:string,webSearch:boolean=false,githubAccess:boolean=false):Promise<string>{
 const p=provider.toLowerCase(),signal=AbortSignal.timeout(70000);
 if(p==="ashnaai"||p==="groq"||p==="ollama"){
  let base="",key="",modelId="";
  if(p==="ashnaai"){key=Deno.env.get("ASHNA_API_KEY")||"";base=Deno.env.get("ASHNA_BASE_URL")||"https://api.ashna.ai/v1/api";modelId=modelOverride||Deno.env.get("ASHNA_DEFAULT_MODEL")||"claude-sonnet-5";if(!key)throw new Error("ASHNA_API_KEY missing in Supabase Function Secrets.");}
  if(p==="groq"){key=Deno.env.get("GROQ_API_KEY")||"";base="https://api.groq.com/openai/v1";modelId=modelOverride||Deno.env.get("GROQ_MODEL")||"llama-3.1-8b-instant";if(!key)throw new Error("GROQ_API_KEY missing in Supabase Function Secrets.");}
  if(p==="ollama"){base=(Deno.env.get("OLLAMA_BASE_URL")||"").replace(/\\/+$/,"");key=Deno.env.get("OLLAMA_API_KEY")||"";modelId=modelOverride||Deno.env.get("OLLAMA_MODEL")||"qwen3:4b";if(!base)throw new Error("OLLAMA_BASE_URL must point to an Ollama endpoint reachable from Supabase.");}
  const h:Record<string,string>={"Content-Type":"application/json"};if(key)h.Authorization="Bearer "+key;
  const r=await fetch(base.replace(/\\/+$/,"")+"/chat/completions",{method:"POST",headers:h,body:JSON.stringify({model:modelId,temperature:0.3,max_tokens:2200,messages:[{role:"system",content:system},{role:"user",content:prompt}]}),signal});
  const t=await r.text();if(!r.ok)throw new Error(p+" "+r.status+": "+t.slice(0,500));
  const data=JSON.parse(t),content=data.choices?.[0]?.message?.content;if(typeof content!=="string"||!content.trim())throw new Error(p+" returned an empty completion.");return content;
 }
 if(p==="gemini"){
  const key=Deno.env.get("GEMINI_API_KEY");if(!key)throw new Error("GEMINI_API_KEY missing in Supabase Function Secrets.");
  const modelId=modelOverride||"gemini-3.5-flash-lite";
  const tools:any[]=[];
  if(webSearch)tools.push({google_search:{}},{url_context:{}});
  if(githubAccess)tools.push({function_declarations:GITHUB_FUNCTIONS});
  const contents:any[]=[{role:"user",parts:[{text:prompt}]}];
  const collectedSources:any[]=[];
  const collectedQueries:string[]=[];
  for(let round=0;round<5;round++){
   const requestBody:any={systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.3,maxOutputTokens:2200}};
   if(tools.length)requestBody.tools=tools;
   else requestBody.generationConfig.responseMimeType="application/json";
   const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(modelId)+":generateContent?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(requestBody),signal});
   const t=await r.text();if(!r.ok)throw new Error("Gemini "+r.status+": "+t.slice(0,500));
   const candidate=JSON.parse(t).candidates?.[0];if(!candidate)throw new Error("Gemini returned no candidate.");
   const grounding=candidate.groundingMetadata||{};
   for(const chunk of grounding.groundingChunks||[]){const web=chunk.web;if(web?.uri&&!collectedSources.some(source=>source.url===web.uri))collectedSources.push({title:String(web.title||web.uri),url:String(web.uri)});}
   for(const query of grounding.webSearchQueries||[])if(!collectedQueries.includes(query))collectedQueries.push(query);
   const parts=candidate.content?.parts||[];
   const calls=parts.filter((part:any)=>part.functionCall?.name);
   if(calls.length){
    if(!githubAccess)throw new Error("Gemini requested a repository tool that is not enabled.");
    contents.push(candidate.content);
    const responses=[];
    for(const part of calls.slice(0,4)){
     const call=part.functionCall;
     let result:any;
     try{result=await runAgentTool(String(call.name),call.args||{});}catch(error){result={error:String(error).slice(0,500)};}
     responses.push({functionResponse:{name:String(call.name),id:String(call.id||""),response:result}});
    }
    contents.push({role:"user",parts:responses});
    continue;
   }
   const content=parts.map((part:any)=>part.text||"").join("");
   if(typeof content!=="string"||!content.trim())throw new Error("Gemini returned an empty completion.");
   if(collectedSources.length||collectedQueries.length){
    try{const payload=parse(content);payload.web_sources=collectedSources;payload.web_search_queries=collectedQueries;return JSON.stringify(payload);}catch{return content;}
   }
   return content;
  }
  throw new Error("Gemini exceeded the repository tool-call limit for one task.");
 }
 throw new Error("Provider must be ashnaai, gemini, groq, or ollama.");
}
function primaryProviderForAgent(_agentId:string):string{return "gemini";}
function providerForTask(agentId:string,task:any):string{return primaryProviderForAgent(agentId); }
async function mattCycle(force:boolean=false):Promise<any>{
 const enabled=(await setting("autonomy_enabled","false"))==="true";
 if(!enabled&&!force)return {skipped:true,reason:"autonomy_paused"};
 const p=providers();if(!p.gemini)throw new Error("Add GEMINI_API_KEY in Supabase Function Secrets.");
 await setAgentState("matt","planning",HOME_POINTS.command,null);
 const r=await Promise.all([
  db("tonkas_agents?select=id,name,role,department,status,current_task"),
  db("tonkas_tasks?select=id,title,description,assigned_to,status,priority&status=in.(queued,running)&order=created_at.asc&limit=30"),
  db("tonkas_activity?select=kind,actor,message&order=created_at.desc&limit=15"),
  db("tonkas_tasks?select=title,assigned_to,status,result,updated_at&status=in.(completed,blocked,needs_review)&order=updated_at.desc&limit=20"),
  db("tonkas_messages?select=room,sender_id,recipient_id,content,created_at&order=created_at.desc&limit=30")
 ]);
 const lastWeb=await setting("matt_last_web_research_at","");
 const lastWebMs=Date.parse(lastWeb);
 const useWeb=!Number.isFinite(lastWebMs)||Date.now()-lastWebMs>12*60*60*1000;
 const system="You are Matt, the autonomous CEO of Tonkas Town. You run the company without waiting for the owner to press buttons. Your portfolio is HookEngine (active Chrome extension business) and Venture Studio (research and validation of new online businesses). HookEngine is the default priority. SMP OPS KIT is permanently excluded. You can use Google Search and URL Context when web research is enabled; use them for current market, competitor, customer, product and platform facts. Cite sources in the task brief and separate evidence from assumptions. You also have read-only GitHub tools for yazoniplay/HookEngine; inspect actual repository files and recent commits before making HookEngine engineering recommendations. You cannot edit files, push commits, open pull requests or deploy. Review company memory, every agent's workload, open tasks, completed deliverables and team messages. Delegate work to specialists, ask them questions, send follow-up messages, compare their outputs and create the next concrete tasks. Do not merely produce strategy documents repeatedly: move work toward measurable HookEngine activation, retention, product quality, ethical growth, or evidence-backed Venture Studio validation. If the queue is empty, create at least two distinct next-phase tasks unless a real owner approval is blocking progress. Every task description must begin BUSINESS_ID: hookengine, venture_studio, or portfolio. For research tasks, prefix the description with WEB_RESEARCH_REQUIRED. Rotate specialists so Noah, Ivy, Dennis, Finn, Bunc, Maverick, Pham, Luke and Trevor all receive meaningful work over time. At most 3 new tasks and 6 messages per cycle. Never duplicate an open task or repeat a completed deliverable unless the next phase is materially different. Never claim external actions happened. Spending, publishing, contacting customers, changing accounts and irreversible actions require owner approval. Return only JSON: {summary:string,tasks:[{title:string,description:string,agent:string,priority:string,department:string}],messages:[{to:string,room:string,content:string}],approvals:[{title:string,context:string,recommended:string,options:[{id:string,label:string,consequence:string}]}]}. Each task needs a measurable outcome and a concrete internal deliverable.";
 const raw=await model(system,JSON.stringify({goal:await setting("company_goal",""),agents:r[0],open_tasks:r[1],recent_activity:r[2],recent_completed_work:r[3],team_messages:r[4],web_research_enabled:useWeb}),"gemini","gemini-3.5-flash-lite",useWeb,true);
 const data=parse(raw);
 if(useWeb)await setSetting("matt_last_web_research_at",now());
 const sources=Array.isArray(data.web_sources)?data.web_sources:[];
 const summary=String(data.summary||"Matt completed a coordination cycle.").slice(0,1200);
 await log("matt.plan","matt",summary,{provider:"gemini",model:"gemini-3.5-flash-lite",web_sources:sources});
 await message("command","matt",summary);
 for(const t of (data.tasks||[]).slice(0,3)){
  if(!AGENT_IDS.has(t.agent)||t.agent==="matt")continue;
  const title=String(t.title||"New task").slice(0,180);
  const open=await db("tonkas_tasks?select=id&assigned_to=eq."+encodeURIComponent(t.agent)+"&title=eq."+encodeURIComponent(title)+"&status=in.(queued,running)&limit=1");
  if(!open.length)await addTask(title,String(t.description||""),t.agent,"matt",t.priority||"normal",t.department||AGENTS.find(a=>a.id===t.agent)?.department||null);
 }
 for(const m of (data.messages||[]).slice(0,6)){
  const recipient=String(m.to||"all");
  if(recipient!=="all"&&!AGENT_IDS.has(recipient))continue;
  await message(String(m.room||"command"),"matt",String(m.content||""),recipient);
 }
 for(const a of (data.approvals||[]).slice(0,2))if(Array.isArray(a.options)&&a.options.length===5)await addApproval(a.title||"Owner decision",a.context||"",a.recommended||"",a.options,"matt");
 const current=await db("tonkas_agents?select=status&id=eq.matt&limit=1");
 if(current?.[0]?.status==="planning")await setAgentState("matt","idle",HOME_POINTS.command,null);
 return {planned:true,summary,web_research:useWeb,sources:sources.length};
}
async function runOneTask():Promise<any>{
 const rows=await db("tonkas_tasks?select=*&status=eq.queued&assigned_to=not.is.null&order=created_at.asc&limit=40");
 const priorityOrder:Record<string,number>={high:0,normal:1,low:2};const queue=(rows||[]).sort((a:any,b:any)=>(priorityOrder[String(a.priority)]??1)-(priorityOrder[String(b.priority)]??1));
 for(const task of queue){
  const agent=AGENTS.find(a=>a.id===task.assigned_to);if(!agent)continue;
  const claimed=await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id)+"&status=eq.queued",{method:"PATCH",body:{status:"running",updated_at:now()},prefer:"return=representation"});
  if(!claimed.length)continue;
  await setAgentState(agent.id,"working",HOME_POINTS[agent.department]||HOME_POINTS.factory,task.id);
  await log("task.started",agent.name,"Started: "+task.title,{task_id:task.id});
  try{
   const inboxRows=await db("tonkas_messages?select=room,sender_id,recipient_id,content,created_at&order=created_at.desc&limit=40");
   const inbox=(inboxRows||[]).filter((m:any)=>m.recipient_id===agent.id||m.recipient_id==="all"||(!m.recipient_id&&m.room===agent.department)).slice(0,15).reverse();
   const webSearch=/WEB_RESEARCH_REQUIRED|\b(research|competitor|market|customer|pricing|trend|latest|benchmark|validate|evidence|source)\b/i.test(String(task.title)+" "+String(task.description));
   const githubAccess=/BUSINESS_ID:\s*hookengine/i.test(String(task.description));
   const system="You are "+agent.name+", "+agent.role+". Your permanent charter: "+agent.objective+" You are a real specialist on Matt's team, not a generic chatbot. Read your assigned task, company goal and recent team messages. Reply to relevant messages, ask another agent for missing input when useful, and send concise messages to Matt or another specialist when a handoff is needed. "+(webSearch?"You have live Google Search and URL Context tools in this run. Use Google Search for current facts, open useful pages with URL Context, cite source links in the deliverable, and separate verified evidence from assumptions.":"Use the supplied company context; do not invent external research or claim to have browsed.")+" "+(githubAccess?"You have read-only GitHub tools for yazoniplay/HookEngine. Inspect actual repository files and recent commits when relevant, but do not claim to modify files or create commits.":"Do not claim to have inspected a repository.")+" Produce a concrete deliverable with headings, measurable recommendations and next steps. Never claim to edit a repository, publish, purchase, contact customers, or change accounts. External actions require owner approval. Return JSON only: {\"result\":\"deliverable\",\"status\":\"completed|blocked|needs_review\",\"message_to_matt\":\"handoff\",\"messages\":[{\"to\":\"agent-id or matt or all\",\"room\":\"department-id\",\"content\":\"message\"}]}.";
   const prompt=JSON.stringify({task:{title:task.title,instructions:task.description},company_goal:await setting("company_goal",""),recent_messages:inbox});
   const raw=await model(system,prompt,"gemini","gemini-3.5-flash-lite",webSearch,githubAccess);
   const result=parse(raw);
   const status=["completed","blocked","needs_review"].includes(result.status)?result.status:"completed";
   let deliverable=String(result.result||"").slice(0,12500);
   const sources=Array.isArray(result.web_sources)?result.web_sources:[];
   if(sources.length)deliverable+="\n\n## Web sources\n"+sources.slice(0,12).map((source:any)=>"- ["+String(source.title||"Source").replace(/\]/g,"")+"]("+String(source.url||"")+")").join("\n");
   if(Array.isArray(result.web_search_queries)&&result.web_search_queries.length)deliverable+="\n\n**Search queries:** "+result.web_search_queries.slice(0,6).join("; ");
   await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id),{method:"PATCH",body:{status,result:deliverable.slice(0,14000),updated_at:now()},prefer:"return=minimal"});
   await setAgentState(agent.id,status==="completed"?"idle":status==="needs_review"?"reviewing":"blocked",HOME_POINTS[agent.department]||HOME_POINTS.factory,null);
   await log("task."+status,agent.name,task.title+": "+status,{task_id:task.id,web_research:webSearch,github_access:githubAccess,sources:sources.length});
   await message(agent.department,agent.id,deliverable.slice(0,9000),"matt");
   if(result.message_to_matt)await message("command",agent.id,String(result.message_to_matt).slice(0,2000),"matt");
   for(const outgoing of (result.messages||[]).slice(0,5)){
    const recipient=String(outgoing.to||"matt");
    if(recipient!=="all"&&!AGENT_IDS.has(recipient))continue;
    await message(String(outgoing.room||agent.department),agent.id,String(outgoing.content||"").slice(0,3000),recipient);
   }
   return {task_id:task.id,agent:agent.id,status,web_research:webSearch,github_access:githubAccess,sources:sources.length};
  }catch(e){
   await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id),{method:"PATCH",body:{status:"blocked",result:String(e).slice(0,700),updated_at:now()},prefer:"return=minimal"});
   await setAgentState(agent.id,"needs_setup",HOME_POINTS[agent.department]||HOME_POINTS.factory,null);
   await log("task.blocked",agent.name,String(e).slice(0,300),{task_id:task.id});
   return {task_id:task.id,agent:agent.id,status:"blocked",error:String(e).slice(0,300)};
  }
 }
 return {task:null,reason:"queue_empty"};
}
async function runCycle(force:boolean=false):Promise<any>{try{return {plan:await mattCycle(force)};}catch(e){const reason=String(e).slice(0,500);await log("matt.cycle_blocked","matt","Matt could not complete this planning cycle: "+reason,{reason});return {plan:{blocked:true,reason}};}}
async function workerCycle():Promise<any>{if((await setting("autonomy_enabled","false"))!=="true")return {skipped:true,reason:"autonomy_paused"};return await runOneTask();}
async function command(c:any):Promise<any>{const kind=c.type;if(kind==="autonomy.start"){const p=providers();if(!p.gemini)throw new Error("Add GEMINI_API_KEY in Supabase Function Secrets before starting autonomy.");await setSetting("autonomy_enabled","true");await log("autonomy.started","owner","Matt autonomy enabled.");return {ok:true,cycle:await runCycle(false)};}if(kind==="autonomy.stop"){await setSetting("autonomy_enabled","false");await log("autonomy.stopped","owner","Autonomy paused.");return {ok:true};}if(kind==="matt.run")return {ok:true,cycle:await runCycle(true)};if(kind==="task.create"){if(!c.title||!c.description)throw new Error("title and description are required.");if(c.agent_id&&!AGENT_IDS.has(c.agent_id))throw new Error("Unknown agent.");return {ok:true,task_id:await addTask(c.title,c.description,c.agent_id||null,"owner","normal",c.room||null)};}if(kind==="agent.message"){if(!c.content)throw new Error("Message content is required.");const target=AGENT_IDS.has(c.agent_id)?c.agent_id:"matt";await message(c.room||"command","owner",c.content,target);await addTask("Respond to owner",c.content,target,"owner","high",c.room||"command");return {ok:true};}if(kind==="company.goal"){if(!c.company_goal)throw new Error("Company goal is required.");await setSetting("company_goal",String(c.company_goal).slice(0,3000));await log("goal.updated","owner","Company goal updated.");return {ok:true};}if(kind==="approval.answer"){if(!c.approval_id||!c.option_id)throw new Error("approval_id and option_id are required.");const rows=await db("tonkas_approvals?select=*&id=eq."+encodeURIComponent(c.approval_id)+"&status=eq.pending&limit=1");if(!rows.length)throw new Error("Pending approval not found.");const row=rows[0],selected=(row.options||[]).find((o:any)=>o.id===c.option_id);if(!selected)throw new Error("Invalid approval option.");const updated=await db("tonkas_approvals?id=eq."+encodeURIComponent(c.approval_id)+"&status=eq.pending",{method:"PATCH",body:{status:"answered",answer:selected,answered_at:now()},prefer:"return=representation"});if(!updated.length)throw new Error("Approval was already answered.");await message("command","owner","Owner decision: "+row.title+" — "+selected.label,"matt");await addTask("Continue using owner decision",JSON.stringify({decision:selected,context:row.context}),"matt","owner","high","command");await log("approval.answered","owner","Answered: "+row.title,{approval_id:c.approval_id});return {ok:true};}throw new Error("Unknown command.");}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{const u=new URL(req.url);if(req.method==="GET"&&u.pathname.endsWith("/health"))return json({ok:true,service:"tonkas-hq",time:now()});if(req.method!=="POST"&&req.method!=="GET")return json({error:"Method not allowed."},405);const body=req.method==="POST"?await req.json().catch(()=>({})):{};const action=body.action||u.searchParams.get("action")||"snapshot";if(action==="tick"||action==="worker"){if(!await verify(req.headers.get("x-tonkas-cron-token"),"tonkas_cron_token"))return json({error:"Unauthorized scheduled worker."},401);return json({ok:true,result:action==="tick"?await runCycle(false):await workerCycle()});}if(!await verify(req.headers.get("x-hq-admin-token"),"tonkas_admin_token"))return json({error:"Invalid HQ owner token."},401);if(action==="snapshot")return json(await snapshot());if(action==="command")return json(await command(body.command||{}));return json({error:"Unknown action."},400);}catch(e){const errorMessage=e instanceof Error?e.message:String(e);console.error("Tonkas HQ error:",errorMessage);return json({error:errorMessage},500);}});
