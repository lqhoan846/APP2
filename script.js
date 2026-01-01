/***********************
 * CORE STATE
 ************************/
const STORAGE_PREFIX = "AI_TASK_MANAGER_";
const MAX_FUTURE_WEEKS = 4;

let state = {
  spaceId: null,
  userName: null,
  tasks: []
};

/***********************
 * BOOTSTRAP FIX LOADING
 ************************/
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  setTimeout(() => {
    document.getElementById("app-loading")?.remove();

    if (!id) {
      showLanding();
    } else {
      showDashboard(id);
    }
  }, 300);
});

/***********************
 * LANDING
 ************************/
function showLanding() {
  document.getElementById("landing-page").classList.remove("hidden");

  document.getElementById("create-space-btn").onclick = () => {
    const id = crypto.randomUUID();
    const url = `${location.origin}${location.pathname}?id=${id}`;
    document.getElementById("private-link").value = url;
    navigator.clipboard.writeText(url);
  };

  document.getElementById("copy-link-btn").onclick = () => {
    const v = document.getElementById("private-link").value;
    if (v) navigator.clipboard.writeText(v);
  };
}

/***********************
 * DASHBOARD
 ************************/
function showDashboard(id) {
  state.spaceId = id;
  document.getElementById("dashboard-page").classList.remove("hidden");

  loadState();

  renderClock();
  setInterval(renderClock, 1000);

  if (!state.userName) showWelcome();
  else aiSay(`Chào ${state.userName} nha 🌷 Hôm nay mình làm gì tiếp nè?`);

  bindTaskInput();
  renderCalendar();
}

/***********************
 * STORAGE
 ************************/
function saveState() {
  localStorage.setItem(
    STORAGE_PREFIX + state.spaceId,
    JSON.stringify(state)
  );
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_PREFIX + state.spaceId);
  if (raw) Object.assign(state, JSON.parse(raw));
}

/***********************
 * CLOCK (SIÊU CHUẨN)
 ************************/
function renderClock() {
  document.getElementById("live-clock").innerText =
    new Date().toLocaleString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
}

/***********************
 * AI MESSAGE
 ************************/
function aiSay(msg) {
  const box = document.getElementById("ai-message-box");
  box.innerHTML = `💬 <strong>Tui:</strong> ${msg}`;
}

/***********************
 * AI PARSER PRO (TIẾNG VIỆT)
 ************************/
function parseVietnameseTask(text) {
  let input = text.toLowerCase();

  // Chuẩn hóa
  input = input
    .replace("tới", "-")
    .replace("đến", "-")
    .replace(/(\d)h/g, "$1:00")
    .replace("mai", getDateOffset(1))
    .replace("mốt", getDateOffset(2));

  // Time
  const timeMatch = input.match(/(\d{1,2}):?(\d{0,2})\s*-\s*(\d{1,2}):?(\d{0,2})/);
  if (!timeMatch) return error("Thiếu giờ nè 😢");

  const sh = +timeMatch[1];
  const sm = +(timeMatch[2] || 0);
  const eh = +timeMatch[3];
  const em = +(timeMatch[4] || 0);

  // Date
  const dateMatch = input.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (!dateMatch) return error("Thiếu ngày đó nha 🥲");

  const d = +dateMatch[1];
  const m = +dateMatch[2] - 1;
  const y = +(dateMatch[3] || new Date().getFullYear());

  const start = new Date(y, m, d, sh, sm);
  const end = new Date(y, m, d, eh, em);

  if (start < new Date()) return error("Không nhập việc quá khứ được đâu 😭");

  const limit = new Date();
  limit.setDate(limit.getDate() + MAX_FUTURE_WEEKS * 7);
  if (start > limit) return error("Xa quá rồi 😵 Tối đa 4 tuần thôi!");

  const title = text
    .replace(timeMatch[0], "")
    .replace(dateMatch[0], "")
    .trim()
    .slice(0, 40);

  return { title, start, end };
}

function error(msg) {
  return { error: msg };
}

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/***********************
 * TASK INPUT
 ************************/
function bindTaskInput() {
  document.getElementById("add-task-btn").onclick = () => {
    const input = document.getElementById("task-input");
    if (!input.value.trim()) return;

    const parsed = parseVietnameseTask(input.value);
    if (parsed.error) return aiSay(parsed.error);

    state.tasks.push({
      id: crypto.randomUUID(),
      ...parsed,
      color: randomColor()
    });

    saveState();
    input.value = "";

    aiSay(`Đã thêm "${parsed.title}" rồi nha ✨`);
    renderCalendar();
    effect();
  };
}

/***********************
 * CALENDAR (RÚT GỌN)
 ************************/
function renderCalendar() {
  const grid = document.getElementById("current-week-grid");
  grid.innerHTML = "";

  const monday = getMonday(new Date());
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);

    const col = document.createElement("div");
    col.innerHTML = `<strong>${day.toLocaleDateString("vi-VN")}</strong>`;

    state.tasks
      .filter(t => new Date(t.start).toDateString() === day.toDateString())
      .forEach(t => {
        const el = document.createElement("div");
        el.style.background = t.color;
        el.innerHTML = `<b>${t.title}</b><br>${formatTime(t.start)}-${formatTime(t.end)}`;
        col.appendChild(el);
      });

    grid.appendChild(col);
  }
}

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - day + 1);
  return d;
}

function formatTime(d) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/***********************
 * EFFECT
 ************************/
function effect() {
  const icons = ["✨","🌸","💫","🌟","🎈","🫧"];
  const e = document.createElement("div");
  e.innerText = icons[Math.floor(Math.random()*icons.length)];
  e.style.position = "fixed";
  e.style.left = "50%";
  e.style.top = "50%";
  e.style.fontSize = "32px";
  e.style.animation = "pop 0.6s ease";
  document.body.appendChild(e);
  setTimeout(()=>e.remove(),600);
}

function randomColor() {
  return ["#ffd6e0","#d6f0ff","#e7ffd6","#fff2cc","#e5ddff"]
    [Math.floor(Math.random()*5)];
}
