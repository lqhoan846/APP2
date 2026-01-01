/* =========================================================
   GLOBAL CONSTANTS & STATE
========================================================= */

const APP_NAME = "QUẢN LÝ CÔNG VIỆC BẰNG AI";
const CREATOR = "LamQuocHoan";
const MAX_FUTURE_WEEKS = 4;
const STORAGE_PREFIX = "AI_TASK_MANAGER_";

let state = {
  spaceId: null,
  userName: null,
  tasks: [],
  deletedTaskBuffer: null,
};

/* =========================================================
   UTILITIES
========================================================= */

// UUID v4
function generateId() {
  return crypto.randomUUID();
}

// Format date time
function formatDateTime(date) {
  return date.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get start of week (Monday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setHours(-24 * (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Add days
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Save state
function saveState() {
  localStorage.setItem(
    STORAGE_PREFIX + state.spaceId,
    JSON.stringify({
      userName: state.userName,
      tasks: state.tasks,
    })
  );
}

// Load state
function loadState(spaceId) {
  const raw = localStorage.getItem(STORAGE_PREFIX + spaceId);
  if (!raw) return null;
  return JSON.parse(raw);
}

// Show AI message
function aiSay(message) {
  const box = document.getElementById("ai-message-box");
  box.innerHTML = `💬 <strong>Tui:</strong> ${message}`;
}

/* =========================================================
   LANDING PAGE LOGIC
========================================================= */

function initLanding() {
  document.getElementById("create-space-btn").onclick = () => {
    const id = generateId();
    const url = `${location.origin}${location.pathname}?id=${id}`;
    document.getElementById("private-link").value = url;
    navigator.clipboard.writeText(url);
  };

  document.getElementById("copy-link-btn").onclick = () => {
    const input = document.getElementById("private-link");
    if (input.value) {
      navigator.clipboard.writeText(input.value);
      alert("Đã sao chép link rồi nè ✨");
    }
  };
}

/* =========================================================
   DASHBOARD INIT
========================================================= */

function initDashboard(spaceId) {
  state.spaceId = spaceId;

  const stored = loadState(spaceId);
  if (stored) {
    state.userName = stored.userName;
    state.tasks = stored.tasks || [];
  }

  if (!state.userName) {
    showWelcomeModal();
  } else {
    aiSay(`Chào ${state.userName} nhaaa 🌷 Hôm nay mình làm gì tiếp nè?`);
  }

  renderClock();
  setInterval(renderClock, 1000);

  renderCalendar();
  bindTaskInput();
}

/* =========================================================
   WELCOME MODAL
========================================================= */

function showWelcomeModal() {
  const modal = document.getElementById("welcome-modal");
  const overlay = document.getElementById("overlay");
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  document.getElementById("start-btn").onclick = () => {
    const name = document.getElementById("user-name-input").value.trim();
    if (!name) return;
    state.userName = name;
    saveState();
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
    aiSay(`Rất vui được gặp ${name} 🥰 Tui sẽ giúp cậu quản lý mọi thứ nha!`);
  };
}

/* =========================================================
   CLOCK
========================================================= */

function renderClock() {
  document.getElementById("live-clock").innerText =
    "⏰ " + new Date().toLocaleString("vi-VN");
}

/* =========================================================
   AI PARSING (SMART)
========================================================= */
/*
  Mô phỏng AI parsing thông minh:
  - Nhận tiếng Việt
  - Hiểu viết tắt
  - Tách: tên công việc, ngày, giờ bắt đầu, giờ kết thúc
*/

function parseTask(input) {
  input = input.toLowerCase();

  const timeRegex = /(\d{1,2})[:h](\d{0,2})?\s*(?:-|đến)\s*(\d{1,2})[:h]?(\d{0,2})?/;
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/;

  const timeMatch = input.match(timeRegex);
  const dateMatch = input.match(dateRegex);

  if (!timeMatch || !dateMatch) {
    return { error: "Thiếu ngày hoặc giờ rồi đó 🥲 Nhập lại giúp tui nha!" };
  }

  const startHour = parseInt(timeMatch[1]);
  const startMin = parseInt(timeMatch[2] || "0");
  const endHour = parseInt(timeMatch[3]);
  const endMin = parseInt(timeMatch[4] || "0");

  const day = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1;
  const year = parseInt(dateMatch[3] || new Date().getFullYear());

  const start = new Date(year, month, day, startHour, startMin);
  const end = new Date(year, month, day, endHour, endMin);

  if (start < new Date()) {
    return { error: "Không nhập công việc trong quá khứ được đâu nè 😭" };
  }

  const maxFuture = addDays(new Date(), MAX_FUTURE_WEEKS * 7);
  if (start > maxFuture) {
    return { error: "Xa quá rồi á 😵 Chỉ nhập tối đa 4 tuần thôi nha!" };
  }

  const title = input
    .replace(timeRegex, "")
    .replace(dateRegex, "")
    .trim()
    .slice(0, 30);

  return {
    title: title || "Công việc mới",
    start,
    end,
  };
}

/* =========================================================
   TASK INPUT
========================================================= */

function bindTaskInput() {
  document.getElementById("add-task-btn").onclick = () => {
    const input = document.getElementById("task-input");
    if (!input.value.trim()) return;

    const parsed = parseTask(input.value);

    if (parsed.error) {
      aiSay(parsed.error);
      return;
    }

    const overlap = state.tasks.find(
      t =>
        (parsed.start < new Date(t.end) &&
          parsed.end > new Date(t.start))
    );

    if (overlap) {
      aiSay(
        `Ê ${state.userName} 😆 Định phân thân chi thuật à? Trùng với "${overlap.title}" đó!`
      );
      return;
    }

    const task = {
      id: generateId(),
      title: parsed.title,
      start: parsed.start,
      end: parsed.end,
      color: randomColor(),
    };

    state.tasks.push(task);
    saveState();
    input.value = "";

    firework();
    aiSay(`Đã thêm "${task.title}" rồi nha ✨ Cố lên ${state.userName} ơiii!`);
    renderCalendar();
  };
}

/* =========================================================
   CALENDAR RENDER
========================================================= */

function renderCalendar() {
  const grid = document.getElementById("current-week-grid");
  grid.innerHTML = "";

  const weekStart = getWeekStart(new Date());

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const col = document.createElement("div");
    col.innerHTML = `<strong>${day.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    })}</strong>`;

    state.tasks
      .filter(
        t =>
          new Date(t.start).toDateString() === day.toDateString()
      )
      .forEach(task => {
        const el = document.createElement("div");
        el.style.background = task.color;
        el.style.marginTop = "6px";
        el.style.padding = "6px";
        el.style.borderRadius = "10px";
        el.style.fontSize = "12px";
        el.innerHTML = `<strong>${task.title}</strong><br>
        ${new Date(task.start).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${new Date(task.end).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;

        el.oncontextmenu = e => {
          e.preventDefault();
          deleteTask(task.id);
        };

        col.appendChild(el);
      });

    grid.appendChild(col);
  }
}

/* =========================================================
   DELETE + UNDO
========================================================= */

function deleteTask(id) {
  const index = state.tasks.findIndex(t => t.id === id);
  if (index === -1) return;

  state.deletedTaskBuffer = state.tasks[index];
  state.tasks.splice(index, 1);
  saveState();
  renderCalendar();

  aiSay(
    `Tui xóa công việc này nhé? 😢 Nếu hối hận thì reload trang trong 10s nè!`
  );

  setTimeout(() => {
    state.deletedTaskBuffer = null;
  }, 10000);
}

/* =========================================================
   EFFECTS
========================================================= */

function firework() {
  const icons = ["✨", "🌸", "💫", "🎉", "🌟", "🫧"];
  const icon = icons[Math.floor(Math.random() * icons.length)];

  const el = document.createElement("div");
  el.innerText = icon;
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.top = "50%";
  el.style.fontSize = "32px";
  el.style.animation = "pop 0.6s ease";
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 600);
}

function randomColor() {
  const colors = [
    "#ffd6e0",
    "#d6f0ff",
    "#e7ffd6",
    "#fff2cc",
    "#e5ddff",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/* =========================================================
   HELP MODAL
========================================================= */

document.getElementById("help-btn").onclick = () => {
  document.getElementById("guide-modal").classList.remove("hidden");
  document.getElementById("overlay").classList.remove("hidden");
};

document.querySelectorAll(".close-modal").forEach(btn => {
  btn.onclick = () => {
    document.getElementById("guide-modal").classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
  };
});

/* =========================================================
   BOOTSTRAP
========================================================= */

window.onload = () => {
  document.getElementById("app-loading").remove();

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (!id) {
    document.getElementById("landing-page").classList.remove("hidden");
    initLanding();
  } else {
    document.getElementById("dashboard-page").classList.remove("hidden");
    initDashboard(id);
  }
};
