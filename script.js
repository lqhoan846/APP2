const STORAGE = "AI_TASK_MANAGER_";
let state = { id:null, name:null, tasks:[] };

/* ---------- AI PARSER ---------- */
function normalizeText(t){
  return t.toLowerCase().replace(/\s+/g," ").trim();
}
function parseDate(t){
  const now=new Date();
  if(t.includes("hôm nay")) return new Date();
  if(t.includes("mai")) return new Date(now.setDate(now.getDate()+1));
  const m=t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
  if(!m) return null;
  return new Date(m[3]||now.getFullYear(),m[2]-1,m[1]);
}
function parseTime(t){
  const m=t.match(/(\d{1,2})(?:h|:)?(\d{0,2})?\s*(?:-|đến)\s*(\d{1,2})(?:h|:)?(\d{0,2})?/);
  if(!m) return null;
  return {
    sh:+m[1], sm:+(m[2]||0),
    eh:+m[3], em:+(m[4]||0)
  };
}
function aiParseTask(input){
  const t=normalizeText(input);
  const d=parseDate(t);
  if(!d) return {error:"Thiếu ngày rồi nè 🥺"};
  const tm=parseTime(t);
  if(!tm) return {error:"Thiếu giờ rồi nè 😭"};
  const start=new Date(d); start.setHours(tm.sh,tm.sm);
  const end=new Date(d); end.setHours(tm.eh,tm.em);
  if(start<=new Date()) return {error:"Không nhập việc quá khứ được đâu 🥲"};
  const max=new Date(); max.setDate(max.getDate()+28);
  if(start>max) return {error:"Xa quá rồi á 😵"};
  return {
    title: input.replace(/\d.*$/,"").trim().slice(0,30)||"Công việc mới",
    start,end
  };
}

/* ---------- CORE ---------- */
window.onload=()=>{
  loading.remove();
  const id=new URLSearchParams(location.search).get("id");
  if(!id) initLanding();
  else initDashboard(id);
};

function initLanding(){
  landing.classList.remove("hidden");
  createLink.onclick=()=>{
    const id=crypto.randomUUID();
    const link=`${location.origin}${location.pathname}?id=${id}`;
    privateLink.value=link;
    navigator.clipboard.writeText(link);
  };
  copyLink.onclick=()=>navigator.clipboard.writeText(privateLink.value);
}

function initDashboard(id){
  state.id=id;
  loadState();
  dashboard.classList.remove("hidden");
  aiSay(`Chào ${state.name||"bạn"} nha 🌷`);
  setInterval(()=>clock.innerText=new Date().toLocaleString("vi-VN"),1000);
  renderGrid();
}

function aiSay(msg){
  aiBox.innerHTML=`💬 <b>Tui:</b> ${msg}`;
}

function saveState(){
  localStorage.setItem(STORAGE+state.id,JSON.stringify(state));
}
function loadState(){
  const r=localStorage.getItem(STORAGE+state.id);
  if(r) state=JSON.parse(r);
}

/* ---------- CALENDAR ---------- */
function renderGrid(){
  weekGrid.innerHTML="";
  for(let i=0;i<168;i++){
    weekGrid.appendChild(document.createElement("div"));
  }
}

/* ---------- ADD TASK ---------- */
addTask.onclick=()=>{
  const parsed=aiParseTask(taskInput.value);
  if(parsed.error){ aiSay(parsed.error); return; }
  state.tasks.push({...parsed,color:randomColor()});
  saveState();
  aiSay(`Tui thêm "${parsed.title}" cho bạn rồi đó ✨`);
  taskInput.value="";
};

function randomColor(){
  const c=["#ffd6e0","#d6f0ff","#e7ffd6","#fff2cc","#e5ddff"];
  return c[Math.floor(Math.random()*c.length)];
}
