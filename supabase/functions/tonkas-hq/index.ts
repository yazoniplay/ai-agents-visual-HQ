type DbOptions = {method?: string; body?: unknown; prefer?: string};
type ProviderState = {ashnaai:boolean; gemini:boolean; groq:boolean; ollama:boolean; default:string; lightweight:string; matt_model:string; [key:string]: boolean|string};
const SUPABASE_URL=(Deno.env.get("SUPABASE_URL")||"").replace(/\/$/,"");
const SECRET_MAP=(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}")}catch{return {}}})();
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||SECRET_MAP.default||Object.values(SECRET_MAP)[0]||"";
const AGENTS=[
{id:"matt",name:"Matt",role:"CEO & Chief of Staff",department:"command",objective:"Own the portfolio across HookEngine and Venture Studio. Prioritize HookEngine by default, allocate specialist capacity, set measurable outcomes, review deliverables, prevent duplicate tasks, and escalate owner decisions. Never assign work to SMP OPS KIT."},
{id:"dennis",name:"Dennis",role:"Research Lead",department:"research",objective:"For Venture Studio, use live Google Search and URL Context to discover and screen online business opportunities. Assess problem frequency, buyer clarity, urgency, willingness-to-pay evidence, distribution, startup cost and unit economics. Cite primary sources, separate verified evidence from assumptions, and never invent research."},
{id:"finn",name:"Finn",role:"Sales & Orders",department:"factory",objective:"For HookEngine, use web research and read-only repository context to design ethical sales workflows, lead qualification, onboarding and conversion improvements. Do not contact customers, send messages, accept orders or make promises; prepare work for owner approval."},
{id:"bunc",name:"Bunc",role:"Product Operations",department:"factory",objective:"For HookEngine, inspect the public repository with read-only GitHub tools and convert approved product priorities into precise specifications, user flows, implementation tickets, release plans and measurable acceptance criteria. Do not claim code changes or implementation."},
{id:"maverick",name:"Maverick",role:"Marketing Lead",department:"media",objective:"For HookEngine and approved ventures, use live web research to create positioning, organic content strategies, campaign calendars and polished draft copy. Prioritize useful proof over hype. Cite sources. Never publish or claim reach/results without evidence."},
{id:"pham",name:"Pham",role:"Finance & Revenue",department:"revenue",objective:"For HookEngine and the portfolio, use live public pricing research and read-only repository context to model pricing hypotheses, API cost exposure, gross margins, budgets and financial risks. Label missing data; never invent revenue or costs and never move money."},
{id:"luke",name:"Luke",role:"Engineering Lead",department:"factory",objective:"For HookEngine, inspect the public repository with read-only GitHub tools and produce technical plans, architecture reviews, security checklists, test plans and release criteria. Clearly distinguish code inspected from code changed and proposed tests from tests actually run; no repository write access."},
{id:"trevor",name:"Trevor",role:"Quality & Risk",department:"war",objective:"Independently review HookEngine and Venture Studio deliverables and the read-only HookEngine repository for accuracy, completeness, security, policy, evidence quality and acceptance criteria. Return specific defects and a pass/fail recommendation; do not claim tests were executed."},
{id:"ivy",name:"Ivy",role:"Customer Research",department:"research",objective:"Continuously scout public discussions, reviews and communities for explicit unmet needs and buying-intent signals for HookEngine and Venture Studio. Find people saying they wish a solution existed, would pay, or are actively seeking alternatives. Verify source URLs, distinguish anecdotes from repeated demand, and never fabricate quotes or contact anyone."},
{id:"noah",name:"Noah",role:"Operations Analyst",department:"command",objective:"Monitor live Tonkas Town task throughput, cycle time, blockers, approvals, agent workload and measurable business outcomes using actual runtime data. Report unavailable metrics honestly and recommend resource allocation across HookEngine and Venture Studio."}
];
const AGENT_IDS=new Set(AGENTS.map(a=>a.id));
const cors={"Access-Control-Allow-Origin":"https://yazoniplay.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-hq-admin-token, x-tonkas-cron-token","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(data:unknown,status:number=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const now=()=>new Date().toISOString();
function providers():ProviderState{const gemini=!!Deno.env.get("GEMINI_API_KEY"),ollama=!!Deno.env.get("OLLAMA_API_KEY");return {ashnaai:false,gemini,groq:false,ollama,default:gemini?"gemini":"ollama",lightweight:gemini?"gemini":"ollama",matt_model:gemini?"gemini-3.5-flash-lite":(Deno.env.get("OLLAMA_GPT_OSS_MODEL")||"gpt-oss:120b")};}
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
 if(sender!=="owner"&&to&&(to==="all"||AGENT_IDS.has(String(to)))){
  const participants=new Set<string>();
  if(AGENT_IDS.has(sender))participants.add(sender);
  if(to==="all")for(const agent of AGENTS)participants.add(agent.id);
  else if(to&&AGENT_IDS.has(to))participants.add(to);
  await Promise.all([...participants].map(id=>setAgentState(id,"meeting")));
 }
}
async function addTask(title:string,description:string,agent:string|null,creator:string,priority:string="normal",department:string|null=null):Promise<string>{const rows=await db("tonkas_tasks",{method:"POST",body:{title:String(title).slice(0,180),description:String(description).slice(0,10000),assigned_to:agent,created_by:creator,status:"queued",priority:["high","normal","low"].includes(priority)?priority:"normal",department,created_at:now(),updated_at:now()},prefer:"return=representation"});const task=rows&&rows[0];if(!task)throw new Error("Task insert returned no row.");if(agent)await db("tonkas_agents?id=eq."+encodeURIComponent(agent),{method:"PATCH",body:{status:"queued",current_task:task.id,updated_at:now()},prefer:"return=minimal"});await log("task.created",creator,"Created task: "+title,{task_id:task.id,agent});return task.id;}
async function addApproval(title:string,context:string,recommended:string,options:any[],actor:string):Promise<void>{if(!Array.isArray(options)||options.length!==5)throw new Error("Exactly five options are required.");await db("tonkas_approvals",{method:"POST",body:{title:String(title).slice(0,180),context:String(context).slice(0,10000),recommended_option:String(recommended||""),options,status:"pending",created_by:actor,created_at:now()},prefer:"return=minimal"});await log("approval.created",actor,"Decision needed: "+title,{});}
async function snapshot():Promise<any>{
 const r=await Promise.all([
  db("tonkas_agents?select=*&order=name.asc"),db("tonkas_tasks?select=*&order=created_at.desc&limit=100"),db("tonkas_approvals?select=*&status=eq.pending&order=created_at.desc"),db("tonkas_messages?select=*&order=created_at.desc&limit=100"),db("tonkas_activity?select=*&order=created_at.desc&limit=100"),db("tonkas_character_brains?select=*&expires_at=gt."+encodeURIComponent(now())),db("tonkas_meetings?select=*&order=started_at.desc&limit=500"),db("tonkas_opportunities?select=*&order=discovered_at.desc&limit=30"),db("tonkas_agent_profiles?select=*&order=agent_id.asc"),db("tonkas_agent_memory?select=*&order=created_at.desc&limit=60"),db("tonkas_agent_runs?select=*&order=started_at.desc&limit=50")
 ]);
 const agents=r[0]||[],tasks=r[1]||[],approvals=r[2]||[],messages=(r[3]||[]).reverse(),activity=(r[4]||[]).reverse(),character_brains=r[5]||[],meetings=r[6]||[],opportunities=r[7]||[],agent_profiles=r[8]||[],agent_memories=r[9]||[],agent_runs=r[10]||[];
 const quotaBlocked=(await setting("gemini_quota_blocked","false"))==="true",quotaReason=quotaBlocked?await setting("gemini_quota_blocked_reason","Gemini API quota exceeded."):null,autonomy=(await setting("autonomy_enabled","false"))==="true";
 const lastMeeting=meetings[0]||null,scheduledBoundary=(Math.floor(Date.now()/300000)+1)*300000,storedNext=lastMeeting?.next_meeting_at?Date.parse(lastMeeting.next_meeting_at):NaN;
 const next_meeting_at=autonomy?(Number.isFinite(storedNext)&&storedNext>Date.now()?lastMeeting.next_meeting_at:new Date(scheduledBoundary).toISOString()):null;
 return {ok:true,runtime:"live",autonomy_enabled:autonomy,gemini_quota_blocked:quotaBlocked,gemini_quota_blocked_reason:quotaReason,provider_status:providers(),company_goal:await setting("company_goal",""),agents,tasks,approvals,messages,activity,character_brains,meetings,opportunities,agent_profiles,agent_memories,agent_runs,next_meeting_at,server_time:now(),counts:{agents:agents.length,active_agents:agents.filter((a:any)=>["working","planning","reviewing","meeting","researching"].includes(a.status)).length,queued_tasks:tasks.filter((t:any)=>t.status==="queued").length,running_tasks:tasks.filter((t:any)=>t.status==="running").length,pending_approvals:approvals.length}};
}
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
  if(p==="ollama"){base=(Deno.env.get("OLLAMA_BASE_URL")||"https://ollama.com/v1").replace(/\/+$/,"");key=Deno.env.get("OLLAMA_API_KEY")||"";modelId=modelOverride||Deno.env.get("OLLAMA_MODEL")||"gemma4:31b";if(!key)throw new Error("OLLAMA_API_KEY missing in Supabase Function Secrets.");}
  const h:Record<string,string>={"Content-Type":"application/json"};if(key)h.Authorization="Bearer "+key;
  const r=await fetch(base.replace(/\/+$/,"")+"/chat/completions",{method:"POST",headers:h,body:JSON.stringify({model:modelId,temperature:0.3,max_tokens:2200,messages:[{role:"system",content:system},{role:"user",content:prompt}]}),signal});
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
async function modelWithFallback(system:string,prompt:string,webSearch:boolean=false,githubAccess:boolean=false):Promise<{content:string;provider:string;model:string}>{
 const p=providers(),failures:string[]=[];
 if(p.gemini){
  try{const content=await model(system,prompt,"gemini","gemini-3.5-flash-lite",webSearch,githubAccess,25000);parse(content);return {content,provider:"gemini",model:"gemini-3.5-flash-lite"};}
  catch(error){failures.push("Gemini 3.5 Flash-Lite: "+String(error).slice(0,350));try{await log("provider.failover","system","Gemini failed; switching immediately to Ollama GPT-OSS 120B.",{from:"gemini-3.5-flash-lite",reason:String(error).slice(0,500),next:"gpt-oss:120b"});}catch(_){}}
 }
 if(p.ollama){
  const fallbacks=[
   {id:Deno.env.get("OLLAMA_GPT_OSS_MODEL")||"gpt-oss:120b",label:"Ollama GPT-OSS 120B"},
   {id:Deno.env.get("OLLAMA_GEMMA_MODEL")||"gemma4:31b",label:"Ollama Gemma 4"}
  ];
  for(let i=0;i<fallbacks.length;i++){
   const candidate=fallbacks[i],fallbackSystem=system+"\\n\\nFALLBACK PROVIDER NOTICE: You are running on Ollama Cloud model "+candidate.id+". Gemini failed or was unavailable. Google Search, URL Context, and GitHub repository tools are NOT available in this run. Do not claim to have browsed, inspected files, verified current market facts, or cite invented sources. Produce useful work from supplied context, label assumptions, and flag anything requiring live research or repository inspection for human review.";
   try{
    const content=await model(fallbackSystem,prompt,"ollama",candidate.id,false,false,70000);parse(content);
    if(failures.length){try{await log("provider.failover.success","system",candidate.label+" successfully took over after provider failure.",{model:candidate.id,previous_failures:failures});}catch(_){}}
    return {content,provider:"ollama",model:candidate.id};
   }catch(error){
    failures.push(candidate.label+": "+String(error).slice(0,350));
    try{await log("provider.failover","system",candidate.label+" failed; "+(i===0?"trying Gemma 4 next.":"all configured fallback models have failed."),{model:candidate.id,reason:String(error).slice(0,500),next:fallbacks[i+1]?.id||null});}catch(_){}
   }
  }
 }
 if(!p.gemini&&!p.ollama)throw new Error("Neither GEMINI_API_KEY nor OLLAMA_API_KEY is configured in Supabase Function Secrets.");
 throw new Error("All configured AI providers failed. "+failures.join(" | "));
}
async function mattCycle(force:boolean=false):Promise<any>{
 const enabled=(await setting("autonomy_enabled","false"))==="true";
 if(!enabled&&!force)return {skipped:true,reason:"autonomy_paused"};
 const p=providers();if(!p.gemini&&!p.ollama)throw new Error("Add GEMINI_API_KEY or OLLAMA_API_KEY in Supabase Function Secrets.");
 await setAgentState("matt","planning");
 const r=await Promise.all([
  db("tonkas_agents?select=id,name,role,department,status,current_task"),
  db("tonkas_tasks?select=id,title,description,assigned_to,status,priority&status=in.(queued,running)&order=created_at.asc&limit=30"),
  db("tonkas_activity?select=kind,actor,message&order=created_at.desc&limit=15"),
  db("tonkas_tasks?select=title,assigned_to,status,result,updated_at&status=in.(completed,blocked,needs_review)&order=updated_at.desc&limit=20"),
  db("tonkas_messages?select=room,sender_id,recipient_id,content,created_at&order=created_at.desc&limit=30"),
  db("tonkas_agent_profiles?select=agent_id,specialty,mission,responsibilities,procedure,quality_bar,guardrails,procedure_version"),
  db("tonkas_agent_memory?select=agent_id,memory_type,content,created_at&order=created_at.desc&limit=35")
 ]);
 const lastWeb=await setting("matt_last_web_research_at","");
 const lastWebMs=Date.parse(lastWeb);
 const useWeb=!Number.isFinite(lastWebMs)||Date.now()-lastWebMs>12*60*60*1000;
 const system="You are Matt, the autonomous CEO of Tonkas Town. You run the company without waiting for the owner to press buttons. Your portfolio is HookEngine (active Chrome extension business) and Venture Studio (research and validation of new online businesses). HookEngine is the default priority. SMP OPS KIT is permanently excluded. You can use Google Search and URL Context when web research is enabled; use them for current market, competitor, customer, product and platform facts. Cite sources in the task brief and separate evidence from assumptions. You also have read-only GitHub tools for yazoniplay/HookEngine; inspect actual repository files and recent commits before making HookEngine engineering recommendations. You cannot edit files, push commits, open pull requests or deploy. Review company memory, each agent's saved specialist profile and versioned procedure, every agent's workload, open tasks, completed deliverables and team messages. Delegate only to the specialist whose charter matches the work. Delegate work to specialists, ask them questions, send follow-up messages, compare their outputs and create the next concrete tasks. Do not merely produce strategy documents repeatedly: move work toward measurable HookEngine activation, retention, product quality, ethical growth, or evidence-backed Venture Studio validation. If the queue is empty, create at least two distinct next-phase tasks unless a real owner approval is blocking progress. Every task description must begin BUSINESS_ID: hookengine, venture_studio, or portfolio. For research tasks, prefix the description with WEB_RESEARCH_REQUIRED. Rotate specialists so Noah, Ivy, Dennis, Finn, Bunc, Maverick, Pham, Luke and Trevor all receive meaningful work over time. At most 3 new tasks and 6 messages per cycle. Never duplicate an open task or repeat a completed deliverable unless the next phase is materially different. Never claim external actions happened. Spending, publishing, contacting customers, changing accounts and irreversible actions require owner approval. Return only JSON: {summary:string,tasks:[{title:string,description:string,agent:string,priority:string,department:string}],messages:[{to:string,room:string,content:string}],approvals:[{title:string,context:string,recommended:string,options:[{id:string,label:string,consequence:string}]}]}. Each task needs a measurable outcome and a concrete internal deliverable.";
 const generated=await modelWithFallback(system,JSON.stringify({goal:await setting("company_goal",""),agents:r[0],open_tasks:r[1],recent_activity:r[2],recent_completed_work:r[3],team_messages:r[4],specialist_profiles:r[5],institutional_memory:r[6],web_research_enabled:useWeb}),useWeb,true);
 const data=parse(generated.content);
 if(useWeb)await setSetting("matt_last_web_research_at",now());
 const sources=Array.isArray(data.web_sources)?data.web_sources:[];
 const summary=String(data.summary||"Matt completed a coordination cycle.").slice(0,1200);
 await log("matt.plan","matt",summary,{provider:generated.provider,model:generated.provider==="gemini"?"gemini-3.5-flash-lite":"gemma4:31b",web_sources:sources,web_tools_available:generated.provider==="gemini"});
 await message("command","matt",summary);
 await message("command","matt","CEO UPDATE · "+summary,"owner");
 for(const t of (data.tasks||[]).slice(0,3)){
  if(!AGENT_IDS.has(t.agent)||t.agent==="matt")continue;
  const title=String(t.title||"New task").slice(0,180);
  const open=await db("tonkas_tasks?select=id&assigned_to=eq."+encodeURIComponent(t.agent)+"&title=eq."+encodeURIComponent(title)+"&status=in.(queued,running)&limit=1");
  if(!open.length)await addTask(title,String(t.description||""),t.agent,"matt",t.priority||"normal",t.department||AGENTS.find(a=>a.id===t.agent)?.department||null);
 }
 const plannedMessages=(data.messages||[]).slice(0,6);
 for(const m of plannedMessages){
  const recipient=String(m.to||"all");
  if(recipient!=="all"&&!AGENT_IDS.has(recipient))continue;
  await message(String(m.room||"command"),"matt",String(m.content||""),recipient);
 }
 if(!plannedMessages.length){
  const target=AGENT_IDS.has(r[1]?.[0]?.assigned_to)?r[1][0].assigned_to:(data.tasks||[]).find((task:any)=>AGENT_IDS.has(task.agent))?.agent;
  if(target)await message("command","matt","Progress check: send me your current status, evidence gathered, blockers and the next concrete step. I will review your handoff in the next CEO cycle.",target);
 }
 for(const a of (data.approvals||[]).slice(0,2))if(Array.isArray(a.options)&&a.options.length===5)await addApproval(a.title||"Owner decision",a.context||"",a.recommended||"",a.options,"matt");
 const current=await db("tonkas_agents?select=status,current_task&id=eq.matt&limit=1");
 if(current?.[0]?.status==="planning")await setAgentState("matt",current?.[0]?.current_task?"working":"idle");
 return {planned:true,summary,provider:generated.provider,web_research:useWeb&&generated.provider==="gemini",sources:sources.length};
}
async function runOneTask():Promise<any>{
 const rows=await db("tonkas_tasks?select=*&status=eq.queued&assigned_to=not.is.null&order=created_at.asc&limit=40");
 const priorityOrder:Record<string,number>={high:0,normal:1,low:2};const queue=(rows||[]).sort((a:any,b:any)=>(priorityOrder[String(a.priority)]??1)-(priorityOrder[String(b.priority)]??1));
 for(const task of queue){
  const agent=AGENTS.find(a=>a.id===task.assigned_to);if(!agent)continue;
  const claimed=await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id)+"&status=eq.queued",{method:"PATCH",body:{status:"running",updated_at:now()},prefer:"return=representation"});if(!claimed.length)continue;
  const startedAt=now();await setAgentState(agent.id,"working",HOME_POINTS[agent.department]||HOME_POINTS.factory,task.id);await log("task.started",agent.name,"Started: "+task.title,{task_id:task.id});
  try{
   const [inboxRows,profileRows,memoryRows]=await Promise.all([db("tonkas_messages?select=room,sender_id,recipient_id,content,created_at&order=created_at.desc&limit=40"),db("tonkas_agent_profiles?select=*&agent_id=eq."+encodeURIComponent(agent.id)+"&limit=1"),db("tonkas_agent_memory?select=memory_type,content,created_at&agent_id=eq."+encodeURIComponent(agent.id)+"&order=created_at.desc&limit=12")]);
   const inbox=(inboxRows||[]).filter((m:any)=>m.recipient_id===agent.id||m.recipient_id==="all"||(!m.recipient_id&&m.room===agent.department)).slice(0,15).reverse(),profile=profileRows?.[0]||null,persistentMemory=memoryRows||[];
   const webSearch=/WEB_RESEARCH_REQUIRED|\b(research|competitor|market|customer|pricing|trend|latest|benchmark|validate|evidence|source)\b/i.test(String(task.title)+" "+String(task.description)),githubAccess=/BUSINESS_ID:\s*hookengine/i.test(String(task.description));
   const system="You are "+agent.name+", "+agent.role+". Your permanent charter: "+agent.objective+". Your saved specialty profile and versioned operating procedure are authoritative: "+JSON.stringify(profile||{})+". Follow the procedure step by step. Your persistent institutional memory from prior work is: "+JSON.stringify(persistentMemory)+". You are a specialist, not a generic chatbot. Read your assigned task, company goal and recent team messages. Reply to relevant messages, ask another agent for missing input when useful, and send concise messages to Matt or another specialist when a handoff is needed. "+(webSearch?"You have live Google Search and URL Context tools in this run. Use Google Search for current facts, open useful pages with URL Context, cite source links in the deliverable, and separate verified evidence from assumptions.":"Use supplied company context; do not invent external research or claim to have browsed.")+" "+(githubAccess?"You have read-only GitHub tools for yazoniplay/HookEngine. Inspect actual repository files and recent commits when relevant, but do not claim to modify files or create commits.":"Do not claim to have inspected a repository.")+" Produce a concrete deliverable with headings, measurable recommendations and next steps. At the end, provide up to 3 durable memory_updates: reusable facts, decisions, constraints, or lessons that improve future work. Do not store temporary status or repeat the task description. Never claim to edit a repository, publish, purchase, contact customers, or change accounts. External actions require owner approval. Return JSON only: {\"result\":\"deliverable\",\"status\":\"completed|blocked|needs_review\",\"message_to_matt\":\"handoff\",\"memory_updates\":[{\"type\":\"lesson|decision|fact\",\"content\":\"durable memory\"}],\"messages\":[{\"to\":\"agent-id or matt or all\",\"room\":\"department-id\",\"content\":\"message\"}]}";
   const runtimeState=agent.id==="noah"?await Promise.all([db("tonkas_agents?select=id,status,department"),db("tonkas_tasks?select=id,status,priority,assigned_to,created_at,updated_at"),db("tonkas_approvals?select=id,status")]):null;
   const prompt=JSON.stringify({task:{title:task.title,instructions:task.description},company_goal:await setting("company_goal",""),agent_profile:profile,persistent_memory:persistentMemory,recent_messages:inbox,runtime_state:runtimeState});
   const generated=await modelWithFallback(system,prompt,webSearch,githubAccess),result=parse(generated.content);
   let status=["completed","blocked","needs_review"].includes(result.status)?result.status:"completed",rawDeliverable=String(result.result||"").trim(),deliverable=rawDeliverable.slice(0,12500);
   const normalizedDeliverable=rawDeliverable.toLowerCase().replace(/[.!]/g,"").trim();
   const placeholderResponse=rawDeliverable.length<180||["deliverable","placeholder","todo","tbd","coming soon","insert here","your text here"].includes(normalizedDeliverable);
   if(placeholderResponse){status="needs_review";deliverable="QUALITY GATE: The model returned an empty or placeholder response. This task is not accepted as completed. Re-run with a concrete deliverable and verifiable supporting detail.";}
   if(generated.provider==="ollama"&&(webSearch||githubAccess)){if(status==="completed")status="needs_review";deliverable+="\n\n> **Verification required:** This task ran on the Ollama fallback. Live web research and GitHub tools were unavailable, so current external claims and repository-specific findings have not been verified.";}
   const sources=Array.isArray(result.web_sources)?result.web_sources:[],updates=Array.isArray(result.memory_updates)?result.memory_updates.slice(0,3):[],cleanUpdates=(placeholderResponse?[]:updates.map((m:any)=>({memory_type:["lesson","decision","fact"].includes(String(m.type))?String(m.type):"lesson",content:String(m.content||"").trim().slice(0,1800)}))).filter((m:any)=>m.content.length>=20);
   if(sources.length)deliverable+="\n\n## Web sources\n"+sources.slice(0,12).map((source:any)=>"- ["+String(source.title||"Source").replace(/\]/g,"")+"]("+String(source.url||"")+")").join("\n");
   if(Array.isArray(result.web_search_queries)&&result.web_search_queries.length)deliverable+="\n\n**Search queries:** "+result.web_search_queries.slice(0,6).join("; ");
   await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id),{method:"PATCH",body:{status,result:deliverable.slice(0,14000),updated_at:now()},prefer:"return=minimal"});
   await setAgentState(agent.id,status==="completed"?"idle":status==="needs_review"?"reviewing":"blocked",HOME_POINTS[agent.department]||HOME_POINTS.factory,null);
   for(const memory of cleanUpdates)await db("tonkas_agent_memory?on_conflict=agent_id,source_task_id,memory_type",{method:"POST",body:{agent_id:agent.id,memory_type:memory.memory_type,content:memory.content,source_task_id:task.id,confidence:0.85,created_at:now()},prefer:"resolution=merge-duplicates,return=minimal"});
   await db("tonkas_agent_runs",{method:"POST",body:{agent_id:agent.id,task_id:task.id,provider:generated.provider,model:generated.provider==="gemini"?"gemini-3.5-flash-lite":"gemma4:31b",status,procedure_version:profile?.procedure_version||1,started_at:startedAt,finished_at:now(),summary:deliverable.slice(0,2400),sources,memory_updates:cleanUpdates},prefer:"return=minimal"});
   await log("task."+status,agent.name,task.title+": "+status,{task_id:task.id,provider:generated.provider,model:generated.provider==="gemini"?"gemini-3.5-flash-lite":"gemma4:31b",web_research:webSearch&&generated.provider==="gemini",github_access:githubAccess&&generated.provider==="gemini",sources:sources.length,memory_updates:cleanUpdates.length,procedure_version:profile?.procedure_version||1});
   await message(agent.department,agent.id,deliverable.slice(0,9000),"matt");if(!placeholderResponse&&result.message_to_matt)await message("command",agent.id,String(result.message_to_matt).slice(0,2000),"matt");
   for(const outgoing of (placeholderResponse?[]:(result.messages||[]).slice(0,5))){const recipient=String(outgoing.to||"matt");if(recipient!=="all"&&!AGENT_IDS.has(recipient))continue;await message(String(outgoing.room||agent.department),agent.id,String(outgoing.content||"").slice(0,3000),recipient);}
   return {task_id:task.id,agent:agent.id,status,provider:generated.provider,web_research:webSearch&&generated.provider==="gemini",github_access:githubAccess&&generated.provider==="gemini",sources:sources.length,memory_updates:cleanUpdates.length,procedure_version:profile?.procedure_version||1};
  }catch(e){const reason=String(e).slice(0,700);await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id),{method:"PATCH",body:{status:"blocked",result:reason,updated_at:now()},prefer:"return=minimal"});await setAgentState(agent.id,"needs_setup",HOME_POINTS[agent.department]||HOME_POINTS.factory,null);await db("tonkas_agent_runs",{method:"POST",body:{agent_id:agent.id,task_id:task.id,status:"blocked",started_at:startedAt,finished_at:now(),summary:reason,procedure_version:1},prefer:"return=minimal"}).catch(()=>{});if(isQuotaError(e))await pauseForQuota(reason);await log("task.blocked",agent.name,reason.slice(0,300),{task_id:task.id,quota_blocked:isQuotaError(e)});return {task_id:task.id,agent:agent.id,status:"blocked",error:reason.slice(0,300),quota_blocked:isQuotaError(e)};}
 }
 return {task:null,reason:"queue_empty"};
}
async function pauseForQuota(reason:string):Promise<void>{
 await setSetting("gemini_quota_blocked","true");
 await setSetting("gemini_quota_blocked_reason",reason.slice(0,1000));
 await setSetting("autonomy_enabled","false");
 await setAgentState("matt","blocked",HOME_POINTS.command,null);
 await log("provider.quota_blocked","system","Autonomy paused after Gemini quota exhaustion. Queued work has been preserved.",{provider:"gemini",model:"gemini-3.5-flash-lite",reason:reason.slice(0,700)});
}
function isQuotaError(error:unknown):boolean{return /Gemini 429|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(String(error));}
async function runCycle(force:boolean=false):Promise<any>{
 try{return {plan:await mattCycle(force)};}
 catch(e){
  const reason=String(e).slice(0,700);
  if(isQuotaError(e))await pauseForQuota(reason);
  await log("matt.cycle_blocked","matt","Matt could not complete this planning cycle: "+reason,{reason});
  return {plan:{blocked:true,reason,quota_blocked:isQuotaError(e)}};
 }
}
const CHARACTER_NODES=["A","B","D","C","L","P","N","H","V","E","F","G","M","Md","R","Fd","J","K"];
async function runCharacterBrain():Promise<any>{
 const [agents,tasks,messages,previous]=await Promise.all([
  db("tonkas_agents?select=id,name,role,department,objective,status,current_task,x,y&order=name.asc"),
  db("tonkas_tasks?select=id,title,assigned_to,status&status=in.(queued,running)&order=created_at.asc&limit=25"),
  db("tonkas_messages?select=sender_id,recipient_id,content,created_at&order=created_at.desc&limit=30"),
  db("tonkas_character_brains?select=agent_id,speech,destination_node,action,target_agent,look_direction")
 ]);
 const taskById=new Map((tasks||[]).map((t:any)=>[String(t.id),t]));
 const roster=(agents||[]).map((a:any)=>({id:a.id,name:a.name,role:a.role,department:a.department,objective:a.objective,status:a.status,current_task:taskById.get(String(a.current_task))||null,position:{x:a.x,y:a.y}}));
 const recent=(messages||[]).slice(0,18).reverse().map((m:any)=>({from:m.sender_id,to:m.recipient_id,text:String(m.content||"").slice(0,180)}));
 const system="You are the live character-brain controller for Tonkas Town, a persistent top-down pixel-art village. You are not writing a report. You are deciding the next believable physical action for each named AI character. Each character has its own identity, role, objective and current work; preserve those distinct personalities and responsibilities. For EVERY roster member return exactly one action. Choose a destination_node from this village navigation graph: A=CEO command HQ, B=town square, D=central crossroads, C=research lodge, L=library path, P=market path, N=farm lane, H=east road, V=lookout, E=pond path, F=workshop road, G=southern grove, M=library, Md=media studio, R=revenue house, Fd=factory/workshop, J=meeting path, K=meeting hall. Actions: idle, working, walking, talking, looking, meeting, blocked. look_direction: up/down/left/right. target_agent must be another roster id or null. speech must be a short natural in-world line (max 150 characters), or empty. Use speech only when action is talking or meeting. Do not repeat recent dialogue. Each cycle, create 1-2 purposeful spoken lines across the team; if target_agent is set, include a short line addressed to that agent. Avoid generic filler. Be purposeful: working agents can stay near their work site; agents needing collaboration should walk to the other agent's area and target them; idle agents should occasionally explore, inspect the village, or look around. Each cycle, send 2-3 characters to a purposeful nearby destination or exploration point unless their task requires them to stay put. Do not make every character work at their home node, and do not make all characters move together. Consider previous_character_behaviors and vary actions, destinations and gaze naturally while preserving task focus. Matt is a real autonomous executive, not a decorative NPC. Do not default him to standing at command HQ. Each cycle, choose a purposeful destination based on the agent he needs to check in with: C for research, Fd for engineering/product, Md for marketing, R for finance, K for an executive meeting, A for private planning. Matt should actively visit and speak to a relevant specialist, face that specialist, and use a short specific line about their current task or blocker. Prefer talking/meeting/walking over idle. He must independently move; never wait for the owner to move or position him. Do not fabricate completed tasks or claim external actions. Output ONLY JSON: {\"agents\":[{\"id\":\"...\",\"destination_node\":\"...\",\"action\":\"...\",\"look_direction\":\"...\",\"target_agent\":null,\"speech\":\"...\"}]}";
 const previous_character_behaviors=(previous||[]).map((p:any)=>({agent_id:p.agent_id,destination_node:p.destination_node,action:p.action,target_agent:p.target_agent,look_direction:p.look_direction}));
 const prompt=JSON.stringify({roster,recent_conversation:recent,previous_character_behaviors,open_work:tasks,world_time:now(),instructions:"Think independently for every character. Decide where they should physically go, who they should face, what they should be doing, and whether they have something worth saying right now."});
 const generated=await modelWithFallback(system,prompt,false,false);
 const parsed=parse(generated.content),allowedActions=new Set(["idle","working","walking","talking","looking","meeting","blocked"]),directions=new Set(["up","down","left","right"]),prev=new Map((previous||[]).map((p:any)=>[String(p.agent_id),String(p.speech||"")]));
 if(!Array.isArray(parsed.agents))throw new Error("Character brain did not return an agents array.");
 const seen=new Set<string>(),states:any[]=[];
 for(const raw of parsed.agents){
  const id=String(raw?.id||"");if(!AGENT_IDS.has(id)||seen.has(id))continue;seen.add(id);
  const destination=CHARACTER_NODES.includes(String(raw.destination_node))?String(raw.destination_node):(roster.find((a:any)=>a.id===id)?.department==="research"?"C":"A");
  const action=allowedActions.has(String(raw.action))?String(raw.action):"idle";
  const direction=directions.has(String(raw.look_direction))?String(raw.look_direction):"down";
  const target=AGENT_IDS.has(String(raw.target_agent||""))&&String(raw.target_agent)!==id?String(raw.target_agent):null;
  const speech=["talking","meeting"].includes(action)?String(raw.speech||"").replace(/[\\r\n]+/g," ").slice(0,150):"";
  states.push({agent_id:id,destination_node:destination,action,look_direction:direction,target_agent:target,speech,updated_at:now(),expires_at:new Date(Date.now()+180000).toISOString()});
 }
 const mattState=states.find((s:any)=>s.agent_id==="matt");
 if(mattState){
  const nextTask=(tasks||[]).find((t:any)=>t.assigned_to&&t.assigned_to!=="matt"&&t.status==="running")||(tasks||[]).find((t:any)=>t.assigned_to&&t.assigned_to!=="matt");
  const targetId=String(nextTask?.assigned_to||"ivy");
  const targetAgent=AGENTS.find(a=>a.id===targetId);
  const targetNode:Record<string,string>={research:"C",factory:"Fd",media:"Md",revenue:"R",war:"K",command:"A"};
  if(targetAgent){
   mattState.destination_node=targetNode[targetAgent.department]||"A";
   mattState.action="talking";
   mattState.look_direction="down";
   mattState.target_agent=targetId;
   mattState.speech=(targetAgent.name+", status check: "+String(nextTask?.title||"your current priority")+". What is the next step or blocker?").slice(0,150);
  }
 }
 if(states.length!==AGENTS.length)throw new Error("Character brain returned "+states.length+" of "+AGENTS.length+" agents; refusing partial world update.");
 await db("tonkas_character_brains",{method:"POST",body:states,prefer:"resolution=merge-duplicates,return=minimal"});
 const utterances=states.filter((s:any)=>s.speech&&s.speech!==prev.get(s.agent_id)).slice(0,3);
 for(const s of utterances)await db("tonkas_messages",{method:"POST",body:{room:"village",sender_id:s.agent_id,recipient_id:s.target_agent,content:s.speech},prefer:"return=minimal"});
 await log("character.brain","Tonkas AI","Updated live movement, gaze and dialogue for "+states.length+" characters.",{provider:generated.provider,speaking:utterances.map((s:any)=>s.agent_id)});
 return {updated:states.length,provider:generated.provider,speaking:utterances.length};
}
async function runTeamMeeting():Promise<any>{
 if((await setting("autonomy_enabled","false"))!=="true")return {skipped:true,reason:"autonomy_paused"};
 const last=await setting("last_team_meeting_at","");
 if(last&&Date.now()-Date.parse(last)<4.5*60*1000)return {skipped:true,reason:"meeting_interval_not_reached"};
 const startedAt=now(),nextBoundary=(Math.floor(Date.now()/300000)+1)*300000,nextMeetingAt=new Date(nextBoundary).toISOString();
 const [agents,tasks,activity,messages,opportunities,profiles,memory]=await Promise.all([
  db("tonkas_agents?select=id,name,role,department,status,current_task"),
  db("tonkas_tasks?select=id,title,description,assigned_to,status,priority,result&status=in.(queued,running,completed,blocked,needs_review)&order=updated_at.desc&limit=35"),
  db("tonkas_activity?select=kind,actor,message,created_at&order=created_at.desc&limit=18"),
  db("tonkas_messages?select=sender_id,recipient_id,content,created_at&order=created_at.desc&limit=30"),
  db("tonkas_opportunities?select=id,title,problem,buyer,buying_signal,evidence_level,source_url,score,status&status=in.(new,researching,validated,owner_review)&order=discovered_at.desc&limit=12"),
  db("tonkas_agent_profiles?select=agent_id,specialty,mission,responsibilities,procedure,quality_bar,guardrails,procedure_version"),
  db("tonkas_agent_memory?select=agent_id,memory_type,content,created_at&order=created_at.desc&limit=30")
 ]);
 const system="You are Matt chairing a real Tonkas Town operating meeting. Use each agent saved specialist profile and versioned operating procedure as the source of their responsibilities. Review real workload, completed deliverables, blockers, messages, prior institutional memory, and customer evidence. Ivy is permanently dedicated to public customer-demand and competitor-feedback research; never assign her unrelated work. Focus HookEngine first; Venture Studio only when evidence supports it. SMP OPS KIT is excluded. The meeting record must be useful later: provide a clear title, agenda, structured discussion, conclusions, unresolved questions, and decisions with one accountable owner, measurable success criteria and due time. Discussion must synthesize supplied evidence and agent work, not invent dialogue or opinions attributed to agents. State when information is missing. If there is no material progress, say so and agree a small useful follow-up rather than manufacturing activity. All work is internal only. No customer contact, outreach, publishing, purchases, spending, or account changes. Return JSON only: {\"meeting_title\":\"...\",\"summary\":\"...\",\"agenda\":[\"...\"],\"discussion\":[{\"topic\":\"...\",\"key_points\":[\"...\"],\"evidence\":[\"...\"],\"conclusion\":\"...\",\"open_questions\":[\"...\"]}],\"decisions\":[{\"decision\":\"...\",\"owner\":\"agent id\",\"priority\":\"high|normal|low\",\"success_criteria\":\"...\",\"due_minutes\":number}],\"messages\":[{\"to\":\"agent id or all\",\"content\":\"...\"}]}";
 const previous=(await db("tonkas_meetings?select=summary&order=started_at.desc&limit=1"))?.[0]?.summary||null;
 const generated=await modelWithFallback(system,JSON.stringify({company_goal:await setting("company_goal",""),agents,tasks,recent_activity:activity,recent_messages:messages,customer_opportunities:opportunities,specialist_profiles:profiles,institutional_memory:memory,previous_meeting_summary:previous,meeting_time:startedAt}),false,false);
 const data=parse(generated.content),summary=String(data.summary||"").trim().slice(0,5000);
 if(!summary)throw new Error("Meeting model returned no summary; meeting was not recorded.");
 const decisions=Array.isArray(data.decisions)?data.decisions.slice(0,4):[];
 const agenda=Array.isArray(data.agenda)?data.agenda.slice(0,10).map((v:any)=>String(v).slice(0,500)):[];
 const discussion=Array.isArray(data.discussion)?data.discussion.slice(0,12).map((v:any)=>({topic:String(v.topic||"").slice(0,300),key_points:Array.isArray(v.key_points)?v.key_points.slice(0,8).map((x:any)=>String(x).slice(0,1000)):[],evidence:Array.isArray(v.evidence)?v.evidence.slice(0,8).map((x:any)=>String(x).slice(0,1000)):[],conclusion:String(v.conclusion||"").slice(0,1000),open_questions:Array.isArray(v.open_questions)?v.open_questions.slice(0,8).map((x:any)=>String(x).slice(0,500)):[]})):[];
 const attendees=(agents||[]).map((a:any)=>a.id),actionItems=decisions.map((d:any)=>({decision:String(d.decision||"").slice(0,500),owner:String(d.owner||""),priority:String(d.priority||"normal"),success_criteria:String(d.success_criteria||"").slice(0,1200),due_minutes:Math.max(5,Math.min(1440,Number(d.due_minutes)||30)),task_id:null}));
 const rows=await db("tonkas_meetings",{method:"POST",body:{title:String(data.meeting_title||"Executive operating review").slice(0,180),summary,agenda,discussion,decisions,action_items:actionItems,attendees,provider:generated.provider,started_at:startedAt,next_meeting_at:nextMeetingAt,ended_at:now(),duration_seconds:Math.max(0,Math.round((Date.now()-Date.parse(startedAt))/1000))},prefer:"return=representation"});
 const meetingId=rows?.[0]?.id||null;if(!meetingId)throw new Error("Meeting record insert returned no id.");
 await setSetting("last_team_meeting_at",startedAt);
 await log("meeting.completed","Matt",summary,{meeting_id:meetingId,provider:generated.provider,decisions:decisions.length,attendees,discussion_topics:discussion.length});
 await message("meetings","matt","TEAM MEETING · "+String(data.meeting_title||"Executive operating review")+"\n"+summary,"all");
 for(const m of (Array.isArray(data.messages)?data.messages:[]).slice(0,8)){const to=AGENT_IDS.has(String(m.to))?String(m.to):"all";await message("meetings","matt",String(m.content||"").slice(0,1800),to);}
 let assigned=0;
 for(let i=0;i<decisions.length;i++){const d=decisions[i],owner=String(d.owner||"");if(!AGENT_IDS.has(owner)||owner==="matt")continue;const title=String(d.decision||"").slice(0,160);if(owner==="ivy"&&!/(demand|buying|customer|opportunity|public.*signal|scout|competitor|review)/i.test(title))continue;if(!title)continue;
  const open=await db("tonkas_tasks?select=id&assigned_to=eq."+encodeURIComponent(owner)+"&title=eq."+encodeURIComponent(title)+"&status=in.(queued,running)&limit=1");if(open.length){actionItems[i].task_id=open[0].id;continue;}
  const profile=profiles.find((p:any)=>p.agent_id===owner),desc="BUSINESS_ID: "+(owner==="dennis"?"venture_studio":"hookengine")+"\nCreated from meeting "+meetingId+".\nObjective: "+title+"\nSuccess criteria: "+String(d.success_criteria||"Deliver an evidence-backed internal recommendation.").slice(0,1200)+"\nTarget: "+Math.max(5,Math.min(1440,Number(d.due_minutes)||30))+" minutes. Use your saved specialist procedure and persistent memory. Internal work only; no external contact or publishing.";
  actionItems[i].task_id=await addTask(title,desc,owner,"matt",String(d.priority||"normal"),profile?.agent_id==="dennis"?"research":(agents.find((a:any)=>a.id===owner)?.department||null));assigned++;
 }
 await db("tonkas_meetings?id=eq."+encodeURIComponent(meetingId),{method:"PATCH",body:{action_items:actionItems},prefer:"return=minimal"});
 return {meeting_id:meetingId,title:String(data.meeting_title||"Executive operating review"),provider:generated.provider,decisions:decisions.length,tasks_created:assigned,discussion_topics:discussion.length,summary,next_meeting_at:nextMeetingAt};
}
async function runIvyOpportunityScout():Promise<any>{
 const last=await setting("last_ivy_scout_at","");
 if(last&&Date.now()-Date.parse(last)<10*60*1000)return {skipped:true,reason:"scout_interval_not_reached"};
 const p=providers();if(!p.gemini)return {skipped:true,reason:"live_search_requires_gemini"};
 await setSetting("last_ivy_scout_at",now());
 await setAgentState("ivy","researching",HOME_POINTS.research,null);
 const [existing,goal]=await Promise.all([
  db("tonkas_opportunities?select=title,problem,source_url,score,status&order=discovered_at.desc&limit=35"),
  setting("company_goal","")
 ]);
 const system="You are Ivy, Tonkas Town's continuous customer-demand scout. Use live Google Search and source pages to find real public posts, reviews, forum discussions, issue threads and community requests where people express a concrete unmet need or buying intent. Search for language such as 'I wish this existed', 'I'd pay for this', 'is there a tool that', 'looking for a solution', 'any alternative to', 'we need a way to', and explicit willingness to pay. Prioritize recent first-person evidence from Reddit, Indie Hackers, product reviews, GitHub issues, specialist forums and public communities. Look for recurring problems that could support HookEngine or a viable new online product. Do not scrape private spaces, infer private identities, contact anyone, send DMs, or claim the poster is a qualified lead. Do not fabricate quotes, sources, URLs, dates, counts or willingness-to-pay. A quote_excerpt must be an exact short excerpt visible at the cited source, otherwise null. Distinguish a single anecdote from repeated evidence. Ignore generic feature chatter without a clear problem. Return JSON only: {\"findings\":[{\"title\":\"short opportunity\",\"problem\":\"specific unmet need\",\"buyer\":\"likely buyer type\",\"buying_signal\":\"what the public post actually signals\",\"evidence_level\":\"anecdotal|repeated|strong\",\"source_url\":\"direct public URL\",\"source_platform\":\"platform\",\"quote_excerpt\":null,\"estimated_wtp\":\"only if explicitly evidenced, otherwise unknown\",\"score\":1,\"research_notes\":\"what is verified and what remains uncertain\"}]} Return at most 4 findings. Prefer quality over quantity.";
 const prompt=JSON.stringify({company_goal:goal,portfolio:["HookEngine: browser extension that turns articles, selected text and YouTube into social drafts","Venture Studio: validate online business opportunities"],recent_findings:existing,search_instruction:"Search recent public demand signals and explicit willingness-to-pay language. Avoid repeating existing findings."});
 const generated=await modelWithFallback(system,prompt,true,false);
 if(generated.provider!=="gemini"){await setAgentState("ivy","idle",HOME_POINTS.research,null);await log("ivy.scout.skipped","Ivy","Live customer discovery skipped because Gemini live search was unavailable; Ollama fallback cannot browse.",{provider:generated.provider});return {skipped:true,reason:"live_search_unavailable"};}
 const data=parse(generated.content),findings=Array.isArray(data.findings)?data.findings.slice(0,4):[];
 let saved=0,qualified=0;
 for(const f of findings){
  const url=String(f.source_url||"").trim();
  if(!/^https:\/\//i.test(url))continue;
  const duplicate=await db("tonkas_opportunities?select=id&source_url=eq."+encodeURIComponent(url)+"&limit=1");
  if(duplicate.length){await db("tonkas_opportunities?id=eq."+encodeURIComponent(duplicate[0].id),{method:"PATCH",body:{last_seen_at:now()},prefer:"return=minimal"});continue;}
  const score=Math.max(1,Math.min(10,Math.round(Number(f.score)||1)));
  const evidence=["anecdotal","repeated","strong"].includes(String(f.evidence_level))?String(f.evidence_level):"unverified";
  const body={title:String(f.title||"Unclassified demand signal").slice(0,180),problem:String(f.problem||"").slice(0,1800),buyer:String(f.buyer||"").slice(0,500),buying_signal:String(f.buying_signal||"").slice(0,1000),evidence_level:evidence,source_url:url,source_platform:String(f.source_platform||"public web").slice(0,80),quote_excerpt:f.quote_excerpt?String(f.quote_excerpt).slice(0,350):null,estimated_wtp:String(f.estimated_wtp||"Unknown").slice(0,300),score,status:score>=7?"researching":"new",research_notes:String(f.research_notes||"").slice(0,2500),last_seen_at:now()};
  await db("tonkas_opportunities",{method:"POST",body,prefer:"return=minimal"});saved++;
  if(score>=7&&qualified<2){
   const title="Validate demand: "+body.title.slice(0,125);
   const open=await db("tonkas_tasks?select=id&title=eq."+encodeURIComponent(title)+"&status=in.(queued,running)&limit=1");
   if(!open.length){await addTask(title,"BUSINESS_ID: venture_studio\nWEB_RESEARCH_REQUIRED\nIvy found a public demand signal. Verify the source, search for independent corroboration, identify the buyer and competing solutions, assess urgency and willingness to pay, and recommend a small validation test. Source: "+url+"\nSignal: "+body.buying_signal+"\nProblem: "+body.problem+"\nDo not contact the poster or claim they are a lead.", "dennis","ivy","high","research");qualified++;}
  }
 }
 await setAgentState("ivy","idle",HOME_POINTS.research,null);
 await log("ivy.scout.completed","Ivy","Scanned public customer discussions for unmet needs and buying-intent signals.",{provider:generated.provider,results:findings.length,saved,qualified_tasks:qualified});
 return {provider:generated.provider,results:findings.length,saved,qualified_tasks:qualified};
}
async function workerCycle():Promise<any>{
 if((await setting("autonomy_enabled","false"))!=="true")return {skipped:true,reason:"autonomy_paused"};
 const p=providers();if(!p.gemini&&!p.ollama)return {skipped:true,reason:"no_model_provider"};
 let executive:any;try{executive=await runCycle(false);}catch(e){executive={error:String(e).slice(0,500)};await log("matt.cycle_blocked","matt","Matt's executive cycle failed: "+String(e).slice(0,500),{});}
 let brain:any;try{brain=await runCharacterBrain();}catch(e){brain={error:String(e).slice(0,500)};await log("character.brain.error","Tonkas AI","Character brain update failed.",{error:String(e).slice(0,500)});}
 let scout:any;try{scout=await runIvyOpportunityScout();}catch(e){scout={error:String(e).slice(0,500)};await setAgentState("ivy","idle",HOME_POINTS.research,null).catch(()=>{});await log("ivy.scout.error","Ivy","Customer opportunity scan failed.",{error:String(e).slice(0,500)});}
 const work=await runOneTask();
 return {executive,brain,scout,work};
}
async function command(c:any):Promise<any>{const kind=c.type;if(kind==="characters.position"){const positions=Array.isArray(c.positions)?c.positions.slice(0,10):[];for(const p of positions){const id=String(p.id||"");if(!AGENT_IDS.has(id))continue;const x=Number(p.x),y=Number(p.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;await db("tonkas_agents?id=eq."+encodeURIComponent(id),{method:"PATCH",body:{x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y)),updated_at:now()},prefer:"return=minimal"});}return {ok:true,synced:positions.length};}if(kind==="characters.brain")return {ok:true,result:await runCharacterBrain()};if(kind==="autonomy.start"){
 const p=providers();if(!p.gemini&&!p.ollama)throw new Error("GEMINI_API_KEY or OLLAMA_API_KEY is missing from Supabase Function Secrets.");
 const blocked=await db("tonkas_tasks?select=id,assigned_to,result&status=eq.blocked");
 const retry=(blocked||[]).filter((task:any)=>/Gemini 429|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(String(task.result||"")));
 for(const task of retry){
  await db("tonkas_tasks?id=eq."+encodeURIComponent(task.id),{method:"PATCH",body:{status:"queued",result:null,updated_at:now()},prefer:"return=minimal"});
  const agent=AGENTS.find(a=>a.id===task.assigned_to);
  if(agent)await setAgentState(agent.id,"queued",HOME_POINTS[agent.department]||HOME_POINTS.factory,task.id);
 }
 await setSetting("gemini_quota_blocked","false");
 await setSetting("gemini_quota_blocked_reason","");
 await setSetting("autonomy_enabled","true");
 await log("autonomy.started","owner","Matt autonomy enabled; quota-blocked tasks requeued.",{quota_retries:retry.length});
 return {ok:true,quota_retries:retry.length,cycle:await runCycle(false)};
}if(kind==="autonomy.stop"){await setSetting("autonomy_enabled","false");await log("autonomy.stopped","owner","Autonomy paused.");return {ok:true};}if(kind==="matt.run")return {ok:true,cycle:await runCycle(true)};if(kind==="task.create"){if(!c.title||!c.description)throw new Error("title and description are required.");if(c.agent_id&&!AGENT_IDS.has(c.agent_id))throw new Error("Unknown agent.");return {ok:true,task_id:await addTask(c.title,c.description,c.agent_id||null,"owner","normal",c.room||null)};}if(kind==="agent.message"){if(!c.content)throw new Error("Message content is required.");const target=AGENT_IDS.has(c.agent_id)?c.agent_id:"matt";await message(c.room||"command","owner",c.content,target);await addTask("Respond to owner",c.content,target,"owner","high",c.room||"command");return {ok:true};}if(kind==="company.goal"){if(!c.company_goal)throw new Error("Company goal is required.");await setSetting("company_goal",String(c.company_goal).slice(0,3000));await log("goal.updated","owner","Company goal updated.");return {ok:true};}if(kind==="approval.answer"){if(!c.approval_id||!c.option_id)throw new Error("approval_id and option_id are required.");const rows=await db("tonkas_approvals?select=*&id=eq."+encodeURIComponent(c.approval_id)+"&status=eq.pending&limit=1");if(!rows.length)throw new Error("Pending approval not found.");const row=rows[0],selected=(row.options||[]).find((o:any)=>o.id===c.option_id);if(!selected)throw new Error("Invalid approval option.");const updated=await db("tonkas_approvals?id=eq."+encodeURIComponent(c.approval_id)+"&status=eq.pending",{method:"PATCH",body:{status:"answered",answer:selected,answered_at:now()},prefer:"return=representation"});if(!updated.length)throw new Error("Approval was already answered.");await message("command","owner","Owner decision: "+row.title+" — "+selected.label,"matt");await addTask("Continue using owner decision",JSON.stringify({decision:selected,context:row.context}),"matt","owner","high","command");await log("approval.answered","owner","Answered: "+row.title,{approval_id:c.approval_id});return {ok:true};}throw new Error("Unknown command.");}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{const u=new URL(req.url);if(req.method==="GET"&&u.pathname.endsWith("/health"))return json({ok:true,service:"tonkas-hq",time:now()});if(req.method!=="POST"&&req.method!=="GET")return json({error:"Method not allowed."},405);const body=req.method==="POST"?await req.json().catch(()=>({})):{};const action=body.action||u.searchParams.get("action")||"snapshot";if(action==="tick"||action==="worker"||action==="meeting"){if(!await verify(req.headers.get("x-tonkas-cron-token"),"tonkas_cron_token"))return json({error:"Unauthorized scheduled worker."},401);if(action==="meeting")return json({ok:true,result:await runTeamMeeting()});if(action==="tick"){let meeting:any;try{meeting=await runTeamMeeting();}catch(e){meeting={error:String(e).slice(0,500)};await log("meeting.error","Matt","5-minute team meeting failed.",{error:String(e).slice(0,500)});}return json({ok:true,result:{meeting}});}return json({ok:true,result:await workerCycle()});}if(!await verify(req.headers.get("x-hq-admin-token"),"tonkas_admin_token"))return json({error:"Invalid HQ owner token."},401);if(action==="snapshot")return json(await snapshot());if(action==="command")return json(await command(body.command||{}));return json({error:"Unknown action."},400);}catch(e){const errorMessage=e instanceof Error?e.message:String(e);console.error("Tonkas HQ error:",errorMessage);return json({error:errorMessage},500);}});
