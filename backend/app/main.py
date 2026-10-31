from __future__ import annotations
import asyncio, json, os, secrets, sqlite3, uuid
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

DB_PATH=Path(os.getenv("HQ_DB_PATH","./data/hq.sqlite3"))
DB_PATH.parent.mkdir(parents=True,exist_ok=True)
TICK=max(20,int(os.getenv("HQ_TICK_SECONDS","45")))
ADMIN=os.getenv("HQ_ADMIN_TOKEN","")
ORIGINS=[x.strip() for x in os.getenv("HQ_ALLOWED_ORIGINS","*").split(",") if x.strip()]
AGENTS=[
("matt","Matt","CEO & Chief of Staff","command","Own strategy, coordinate the team, create plans, review work, and escalate consequential decisions."),
("dennis","Dennis","Research Lead","research","Research opportunities, validate demand, compare alternatives, and write evidence-based briefs."),
("finn","Finn","Sales & Orders","factory","Manage inbound sales and order workflows; prepare customer-facing drafts for approval."),
("bunc","Bunc","Product Operations","factory","Turn approved ideas into specifications, checklists, and delivery plans."),
("maverick","Maverick","Marketing Lead","media","Plan content, prepare drafts, and maintain brand consistency."),
("pham","Pham","Finance & Revenue","revenue","Track financial inputs, prepare budgets, and flag unusual costs. Never move money."),
("luke","Luke","Engineering Lead","factory","Plan software work, review technical risks, and report test results."),
("trevor","Trevor","Quality & Risk","war","Review deliverables, identify risks, and verify acceptance criteria."),
("ivy","Ivy","Customer Research","research","Summarize customer feedback and identify recurring problems."),
("noah","Noah","Operations Analyst","command","Track task throughput, blockers, and operational metrics.")]
AGENT_IDS={a[0] for a in AGENTS}
def stamp(): return datetime.now(timezone.utc).isoformat()
@contextmanager
def db():
 c=sqlite3.connect(DB_PATH,timeout=20)
 c.row_factory=sqlite3.Row
 c.execute("PRAGMA journal_mode=WAL")
 try:
  yield c
  c.commit()
 except Exception:
  c.rollback()
  raise
 finally:
  c.close()
def init():
 with db() as c:
  c.executescript("""
  CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,name TEXT,role TEXT,department TEXT,objective TEXT,status TEXT DEFAULT 'idle',current_task TEXT,x REAL DEFAULT .5,y REAL DEFAULT .5,updated_at TEXT);
  CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,title TEXT,description TEXT,assigned_to TEXT,created_by TEXT,status TEXT DEFAULT 'queued',priority TEXT DEFAULT 'normal',department TEXT,result TEXT,created_at TEXT,updated_at TEXT);
  CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,room TEXT,sender_id TEXT,recipient_id TEXT,content TEXT,created_at TEXT);
  CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,title TEXT,context TEXT,recommended_option TEXT,options_json TEXT,status TEXT DEFAULT 'pending',answer TEXT,created_by TEXT,created_at TEXT,answered_at TEXT);
  CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY,kind TEXT,actor TEXT,message TEXT,metadata_json TEXT,created_at TEXT);
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
  """)
  for i,a in enumerate(AGENTS): c.execute("INSERT OR IGNORE INTO agents(id,name,role,department,objective,x,y,updated_at) VALUES(?,?,?,?,?,?,?,?)",(*a,.2+(i%5)*.14,.3+(i%4)*.13,stamp()))
  c.execute("INSERT OR IGNORE INTO settings VALUES('autonomy_enabled','false')")
  c.execute("INSERT OR IGNORE INTO settings VALUES('company_goal',?)",("Build a sustainable online business. Prioritize validated customer value, low operating cost, and reliable delivery.",))
def get_setting(k,d=""):
 with db() as c:
  r=c.execute("SELECT value FROM settings WHERE key=?",(k,)).fetchone(); return r["value"] if r else d
def set_setting(k,v):
 with db() as c: c.execute("INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(k,v))
def log(kind,actor,message,meta=None):
 with db() as c: c.execute("INSERT INTO activity VALUES(?,?,?,?,?,?)",(str(uuid.uuid4()),kind,actor,message,json.dumps(meta or {}),stamp()))
def query(sql,args=()):
 with db() as c: return [dict(r) for r in c.execute(sql,args).fetchall()]
def providers():
 return {"openai":bool(os.getenv("OPENAI_API_KEY")),"anthropic":bool(os.getenv("ANTHROPIC_API_KEY")),"gemini":bool(os.getenv("GEMINI_API_KEY")),"default":os.getenv("HQ_DEFAULT_PROVIDER","openai")}
def snapshot():
 agents=query("SELECT * FROM agents ORDER BY CASE id WHEN 'matt' THEN 0 ELSE 1 END,name")
 tasks=query("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100")
 approvals=query("SELECT * FROM approvals WHERE status='pending' ORDER BY created_at DESC")
 for a in approvals: a["options"]=json.loads(a.pop("options_json"))
 messages=query("SELECT * FROM (SELECT * FROM messages ORDER BY created_at DESC LIMIT 100) ORDER BY created_at")
 activity=query("SELECT * FROM (SELECT * FROM activity ORDER BY created_at DESC LIMIT 100) ORDER BY created_at")
 for a in activity: a["metadata"]=json.loads(a.pop("metadata_json") or "{}")
 return {"ok":True,"runtime":"live","autonomy_enabled":get_setting("autonomy_enabled")=="true","provider_status":providers(),"company_goal":get_setting("company_goal"),"agents":agents,"tasks":tasks,"approvals":approvals,"messages":messages,"activity":activity,"server_time":stamp(),"counts":{"agents":len(agents),"active_agents":sum(a["status"] in ("working","planning","reviewing") for a in agents),"queued_tasks":sum(t["status"]=="queued" for t in tasks),"running_tasks":sum(t["status"]=="running" for t in tasks),"pending_approvals":len(approvals)}}
def add_task(title,description,agent,creator,priority="normal",department=None):
 tid=str(uuid.uuid4()); t=stamp()
 with db() as c:
  c.execute("INSERT INTO tasks VALUES(?,?,?,?,?,'queued',?,?,NULL,?,?)",(tid,title[:180],description[:10000],agent,creator,priority,department,t,t))
  if agent: c.execute("UPDATE agents SET status='queued',current_task=?,updated_at=? WHERE id=?",(tid,t,agent))
 log("task.created",creator,"Created task: "+title,{"task_id":tid,"agent":agent}); return tid
def message(room,sender,content,to=None):
 with db() as c: c.execute("INSERT INTO messages VALUES(?,?,?,?,?,?)",(str(uuid.uuid4()),room,sender,to,content[:10000],stamp()))
 log("message",sender,"New message in "+room,{"to":to})
def approval(title,context,recommended,options,actor):
 if len(options)!=5: raise ValueError("Exactly five options are required.")
 aid=str(uuid.uuid4())
 with db() as c: c.execute("INSERT INTO approvals VALUES(?,?,?,?,?,'pending',NULL,?,?,NULL)",(aid,title[:180],context[:10000],recommended,json.dumps(options),actor,stamp()))
 log("approval.created",actor,"Decision needed: "+title,{"approval_id":aid})
async def llm(system,prompt):
 provider=os.getenv("HQ_DEFAULT_PROVIDER","openai").lower()
 async with httpx.AsyncClient(timeout=75) as client:
  if provider=="openai":
   key=os.getenv("OPENAI_API_KEY")
   if not key: raise RuntimeError("OPENAI_API_KEY is missing")
   r=await client.post("https://api.openai.com/v1/chat/completions",headers={"Authorization":"Bearer "+key},json={"model":os.getenv("OPENAI_MODEL","gpt-4.1-mini"),"temperature":.3,"messages":[{"role":"system","content":system},{"role":"user","content":prompt}]}); r.raise_for_status(); return r.json()["choices"][0]["message"]["content"]
  if provider=="anthropic":
   key=os.getenv("ANTHROPIC_API_KEY")
   if not key: raise RuntimeError("ANTHROPIC_API_KEY is missing")
   r=await client.post("https://api.anthropic.com/v1/messages",headers={"x-api-key":key,"anthropic-version":"2023-06-01"},json={"model":os.getenv("ANTHROPIC_MODEL","claude-3-5-haiku-latest"),"max_tokens":1800,"system":system,"messages":[{"role":"user","content":prompt}]}); r.raise_for_status(); return "".join(x.get("text","") for x in r.json().get("content",[]) if x.get("type")=="text")
  if provider=="gemini":
   key=os.getenv("GEMINI_API_KEY")
   if not key: raise RuntimeError("GEMINI_API_KEY is missing")
   model=os.getenv("GEMINI_MODEL","gemini-2.5-flash")
   r=await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",json={"systemInstruction":{"parts":[{"text":system}]},"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"temperature":.3,"maxOutputTokens":1800}}); r.raise_for_status(); return "".join(x.get("text","") for x in r.json()["candidates"][0]["content"]["parts"])
 raise RuntimeError("HQ_DEFAULT_PROVIDER must be openai, anthropic, or gemini")
def parse_json(s):
 s=s.strip()
 if s.startswith("```"): s=s.split("\n",1)[-1].rsplit("```",1)[0]
 return json.loads(s[s.find("{"):s.rfind("}")+1])
async def _matt_cycle():
 if get_setting("autonomy_enabled")!="true" or not any(providers()[k] for k in ("openai","anthropic","gemini")): return
 tasks=query("SELECT id,title,description,assigned_to,status,priority FROM tasks WHERE status IN ('queued','running') ORDER BY created_at LIMIT 30")
 agents=query("SELECT id,name,role,department,status,current_task FROM agents")
 recent=query("SELECT kind,actor,message FROM activity ORDER BY created_at DESC LIMIT 15")
 system="""You are Matt, autonomous CEO and chief of staff. Set priorities and coordinate the company. Delegate concrete internal work to specialist agents. You may create internal tasks and messages. NEVER claim an external action occurred. Spending money, publishing, contacting customers, changing accounts, or irreversible actions require human approval. Output only JSON: {\"summary\":\"...\",\"tasks\":[{\"title\":\"...\",\"description\":\"...\",\"agent\":\"dennis|finn|bunc|maverick|pham|luke|trevor|ivy|noah\",\"priority\":\"high|normal|low\",\"department\":\"...\"}],\"messages\":[{\"to\":\"agent-id or all\",\"room\":\"...\",\"content\":\"...\"}],\"approvals\":[{\"title\":\"...\",\"context\":\"...\",\"recommended\":\"option-id\",\"options\":[{\"id\":\"...\",\"label\":\"...\",\"consequence\":\"...\"} x exactly 5]}]}. At most 3 new tasks and 2 approvals per cycle. Avoid duplicates; review current work first."""
 try:
  data=parse_json(await llm(system,json.dumps({"goal":get_setting("company_goal"),"agents":agents,"open_tasks":tasks,"recent_activity":recent}))
  )
  summary=str(data.get("summary","Matt completed a coordination cycle."))[:1000]; log("matt.plan","matt",summary); message("command","matt",summary)
  for t in data.get("tasks",[])[:3]:
   aid=t.get("agent")
   if aid not in AGENT_IDS or aid=="matt": continue
   title=str(t.get("title","New task"))[:180]
   if not query("SELECT id FROM tasks WHERE assigned_to=? AND title=? AND status IN ('queued','running')",(aid,title)):
    add_task(title,str(t.get("description","")),aid,"matt",t.get("priority","normal"),t.get("department"))
  for m in data.get("messages",[])[:8]: message(str(m.get("room","command")),"matt",str(m.get("content","")),str(m.get("to","all")))
  for a in data.get("approvals",[])[:2]:
   if isinstance(a.get("options"),list) and len(a["options"])==5: approval(str(a.get("title","Owner decision")),str(a.get("context","")),str(a.get("recommended","")),a["options"],"matt")
 except Exception as e: log("runtime.error","matt",f"Matt cycle failed: {type(e).__name__}: {str(e)[:300]}")
MATT_LOCK=asyncio.Lock()
async def matt_cycle():
 async with MATT_LOCK:
  await _matt_cycle()
async def run_tasks():
 if get_setting("autonomy_enabled")!="true": return
 todo=query("SELECT * FROM tasks WHERE status='queued' AND assigned_to IS NOT NULL ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,created_at LIMIT 2")
 for task in todo:
  aid=task["assigned_to"]; spec=next((a for a in AGENTS if a[0]==aid),None)
  if not spec: continue
  with db() as c:
   c.execute("UPDATE tasks SET status='running',updated_at=? WHERE id=? AND status='queued'",(stamp(),task["id"]))
   c.execute("UPDATE agents SET status='working',current_task=?,updated_at=? WHERE id=?",(task["id"],stamp(),aid))
  log("task.started",spec[1],"Started: "+task["title"],{"task_id":task["id"]})
  try:
   system=f"You are {spec[1]}, {spec[2]}. Scope: {spec[4]}. Complete the internal task as a real written deliverable. No internet, shell, files, or external accounts are available. Never claim to have published, purchased, contacted anyone, or changed an account. If an external action is needed, prepare it for approval. Return JSON only: {{\"result\":\"deliverable or precise blocker\",\"status\":\"completed|blocked|needs_review\",\"message_to_matt\":\"handoff\"}}."
   result=parse_json(await llm(system,json.dumps({"task":task["title"],"instructions":task["description"],"goal":get_setting("company_goal")})))
   status=result.get("status","completed")
   if status not in ("completed","blocked","needs_review"): status="completed"
   with db() as c:
    c.execute("UPDATE tasks SET status=?,result=?,updated_at=? WHERE id=?",(status,str(result.get("result",""))[:14000],stamp(),task["id"]))
    c.execute("UPDATE agents SET status=?,current_task=NULL,updated_at=? WHERE id=?",("idle" if status=="completed" else "blocked",stamp(),aid))
   log("task."+status,spec[1],task["title"]+": "+status,{"task_id":task["id"]})
   message(spec[3],aid,str(result.get("result",""))[:9000],"matt")
   if result.get("message_to_matt"): message("command",aid,str(result["message_to_matt"])[:2000],"matt")
  except Exception as e:
   with db() as c:
    c.execute("UPDATE tasks SET status='blocked',result=?,updated_at=? WHERE id=?",(str(e)[:500],stamp(),task["id"]))
    c.execute("UPDATE agents SET status='needs_setup',current_task=NULL,updated_at=? WHERE id=?",(stamp(),aid))
   log("task.blocked",spec[1],str(e)[:300],{"task_id":task["id"]})
async def worker():
 while True:
  try:
   await matt_cycle()
   await run_tasks()
  except Exception as e: log("runtime.error","system",str(e)[:300])
  await asyncio.sleep(TICK)
@asynccontextmanager
async def lifespan(app):
 init(); task=asyncio.create_task(worker()); yield; task.cancel()
 try: await task
 except asyncio.CancelledError: pass
app=FastAPI(title="Tonkas Town HQ Runtime",version="1.0.0",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS if ORIGINS!=["*"] else ["*"],allow_methods=["GET","POST","OPTIONS"],allow_headers=["*"])
class Command(BaseModel):
 type:str
 title:str|None=None
 description:str|None=None
 agent_id:str|None=None
 room:str|None=None
 content:str|None=None
 approval_id:str|None=None
 option_id:str|None=None
 company_goal:str|None=None
def auth(token):
 if ADMIN and not secrets.compare_digest(token or "",ADMIN): raise HTTPException(401,"Invalid admin token")
@app.get("/health")
async def health(): return {"ok":True,"service":"tonkas-town-runtime","time":stamp()}
@app.get("/api/hq/config")
async def config(): return {"providers":providers(),"autonomy_enabled":get_setting("autonomy_enabled")=="true","tick_seconds":TICK,"admin_token_required":bool(ADMIN)}
@app.get("/api/hq/snapshot")
async def get_snapshot(): return snapshot()
@app.get("/api/hq/events")
async def events(request:Request):
 async def stream():
  while not await request.is_disconnected():
   yield "event: snapshot\ndata: "+json.dumps(snapshot())+"\n\n"
   await asyncio.sleep(3)
 return StreamingResponse(stream(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})
@app.post("/api/hq/commands")
async def commands(cmd:Command,x_hq_admin_token:str|None=Header(default=None)):
 auth(x_hq_admin_token); kind=cmd.type
 if kind=="autonomy.start":
  set_setting("autonomy_enabled","true"); log("autonomy.started","user","Matt autonomy enabled."); asyncio.create_task(matt_cycle()); return {"ok":True}
 if kind=="autonomy.stop":
  set_setting("autonomy_enabled","false"); log("autonomy.stopped","user","Autonomy paused."); return {"ok":True}
 if kind=="matt.run": asyncio.create_task(matt_cycle()); return {"ok":True}
 if kind=="task.create":
  if not cmd.title or not cmd.description: raise HTTPException(400,"title and description required")
  if cmd.agent_id and cmd.agent_id not in AGENT_IDS: raise HTTPException(400,"unknown agent")
  return {"ok":True,"task_id":add_task(cmd.title,cmd.description,cmd.agent_id,"user","normal",cmd.room)}
 if kind=="agent.message":
  if not cmd.content: raise HTTPException(400,"content required")
  message(cmd.room or "command","user",cmd.content,cmd.agent_id or "matt")
  add_task("Respond to owner",cmd.content,cmd.agent_id if cmd.agent_id in AGENT_IDS else "matt","user","high",cmd.room or "command")
  return {"ok":True}
 if kind=="company.goal":
  if not cmd.company_goal: raise HTTPException(400,"company_goal required")
  with db() as c: c.execute("INSERT INTO settings VALUES('company_goal',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(cmd.company_goal[:3000],))
  log("goal.updated","user","Company goal updated."); return {"ok":True}
 if kind=="approval.answer":
  if not cmd.approval_id or not cmd.option_id: raise HTTPException(400,"approval_id and option_id required")
  with db() as c:
   row=c.execute("SELECT * FROM approvals WHERE id=? AND status='pending'",(cmd.approval_id,)).fetchone()
   if not row: raise HTTPException(404,"pending approval not found")
   options=json.loads(row["options_json"]); selected=next((o for o in options if o.get("id")==cmd.option_id),None)
   if not selected: raise HTTPException(400,"invalid option")
   c.execute("UPDATE approvals SET status='answered',answer=?,answered_at=? WHERE id=?",(json.dumps(selected),stamp(),cmd.approval_id))
  message("command","user",f"Owner decision: {row['title']} — {selected.get('label')}","matt")
  add_task("Continue using owner decision",json.dumps({"decision":selected,"context":row["context"]}),"matt","user","high","command")
  log("approval.answered","user","Answered: "+row["title"],{"approval_id":cmd.approval_id}); return {"ok":True}
 raise HTTPException(400,"unknown command")
