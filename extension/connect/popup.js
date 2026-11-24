import { DEFAULT_SERVER, call, forget, loadSettings, saveSettings, setBadge } from "./api.js";

const $ = (id) => document.getElementById(id);

// Opened as the toolbar dropdown (a browser without side panels, or an old
// install) rather than the side panel: keep the dropdown's fixed width.
if (chrome.extension?.getViews?.({ type: "popup" }).includes(window)) document.body.classList.add("as-popup");
let settings = { session: "", server: DEFAULT_SERVER };
let pendingEmail = "";
let summary = null;
let ticker = 0;

function show(view) {
  for (const id of ["connect", "main", "loading"]) $(id).hidden = id !== view;
  $("top-actions").hidden = view !== "main";
}

// Opens a dashboard page in a new tab; the side panel stays open beside it.
function open(url) {
  chrome.tabs.create({ url });
}

function dashboard(path = "") {
  return (summary?.dashboard || settings.server).replace(/\/+$/, "") + path;
}

function hours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function ago(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 60 / 24)}d ago`;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child != null) node.append(child);
  return node;
}

function error(id, message) {
  $(id).textContent = message || "";
  $(id).hidden = !message;
}

/* ------------------------------------------------------------ sign in */

// Like the dashboard's sign-in: email, then the code from the email.
function serverValue() {
  return (settings.server || DEFAULT_SERVER).replace(/\/+$/, "");
}

function showStep(step) {
  $("email-form").hidden = step !== "email";
  $("code-form").hidden = step !== "code";
  (step === "email" ? $("email") : $("code")).focus();
}

function showConnect(message) {
  $("code").value = "";
  error("email-error", message);
  error("code-error", "");
  show("connect");
  showStep("email");
}

async function sendCode(resend = false) {
  const email = $("email").value.trim();
  if (!email) return error("email-error", "Enter your work email.");
  $("email-button").disabled = true;
  error("email-error", "");
  error("code-error", "");
  try {
    const sent = await call("/api/extension/sign-in", { server: serverValue() }, { method: "POST", body: { email, resend } });
    pendingEmail = sent.email;
    $("code-note").textContent = sent.note || `We sent a code to ${sent.email}.`;
    $("code").value = "";
    showStep("code");
  } catch (problem) {
    error(resend ? "code-error" : "email-error", problem.message);
  } finally {
    $("email-button").disabled = false;
  }
}

$("email-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendCode();
});

$("code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = $("code").value.replace(/\D/g, "");
  if (code.length < 6) return error("code-error", "Enter the code from the email.");
  $("code-button").disabled = true;
  error("code-error", "");
  try {
    const server = serverValue();
    const signedIn = await call("/api/extension/sign-in", { server }, { method: "POST", body: { email: pendingEmail, code } });
    settings = { session: signedIn.session, server };
    await saveSettings(settings);
    await load();
  } catch (problem) {
    error("code-error", problem.message);
  } finally {
    $("code-button").disabled = false;
  }
});

$("resend").addEventListener("click", () => sendCode(true));
$("change-email").addEventListener("click", () => {
  error("code-error", "");
  showStep("email");
});

$("disconnect").addEventListener("click", async () => {
  await forget();
  settings.session = "";
  summary = null;
  showConnect("Signed out.");
});

/* ------------------------------------------------------------ main */

function renderDay() {
  const day = summary.day;
  $("day-card").hidden = !day;
  if (!day) return;
  const running = Boolean(day.running);
  $("day-dot").classList.toggle("on", running);
  if (day.leave) {
    $("day-title").textContent = "On leave today";
    $("day-sub").textContent = "Enjoy the day off.";
    $("day-button").hidden = true;
    return;
  }
  $("day-button").hidden = false;
  $("day-title").textContent = running ? `Working since ${day.running}` : day.minutes ? "On a break" : "Not started yet";
  $("day-sub").textContent = day.minutes ? `${hours(day.minutes)} logged today` : "Start your day when you begin.";
  $("day-button").textContent = running ? "Stop" : day.minutes ? "Start again" : "Start day";
  $("day-button").classList.toggle("stop", running);
}

function renderTasks() {
  const list = $("tasks");
  list.replaceChildren();
  $("task-count").textContent = String(summary.tasks.length);
  if (!summary.tasksOk) return list.append(el("li", { class: "empty" }, "Couldn't load your tasks."));
  if (!summary.tasks.length) return list.append(el("li", { class: "empty" }, "Nothing due today. Nice."));
  for (const task of summary.tasks) {
    const check = el("button", {
      class: "check",
      title: "Mark done",
      "aria-label": `Mark "${task.title}" done`,
      onclick: async () => {
        check.classList.add("done");
        check.disabled = true;
        try {
          await call("/api/extension/tasks", settings, { method: "POST", body: { id: task.id, status: "done" } });
          summary.tasks = summary.tasks.filter((item) => item.id !== task.id);
          setTimeout(renderTasks, 350);
        } catch (problem) {
          check.classList.remove("done");
          check.disabled = false;
          error("main-error", problem.message);
        }
      },
    });
    const sub = task.late
      ? el("span", { class: "item-sub late" }, `Late · due ${task.due_on}`)
      : el("span", { class: "item-sub" }, task.blocked ? `${task.statusLabel} · blocked` : task.statusLabel);
    list.append(
      el(
        "li",
        {},
        check,
        el(
          "a",
          { class: "item", href: "#", onclick: (event) => (event.preventDefault(), open(dashboard("/tasks"))) },
          el("span", { class: "item-title" }, task.title),
          sub,
        ),
      ),
    );
  }
}

function renderNotifications() {
  const list = $("notifications");
  list.replaceChildren();
  const { items, unread } = summary.notifications;
  $("read-all").hidden = unread === 0;
  if (!items.length) return list.append(el("li", { class: "empty" }, "No notifications yet."));
  for (const item of items) {
    list.append(
      el(
        "li",
        {},
        el("span", { class: item.read ? "read-dot" : "unread-dot" }),
        el(
          "a",
          {
            class: "item",
            href: "#",
            onclick: async (event) => {
              event.preventDefault();
              if (!item.read) await call("/api/extension/notifications", settings, { method: "POST", body: { id: item.id } }).catch(() => {});
              open(dashboard(item.href));
            },
          },
          el("span", { class: "item-title" }, item.title),
          el("span", { class: "item-sub" }, [item.body, ago(item.created_at)].filter(Boolean).join(" · ")),
        ),
      ),
    );
  }
}

function render() {
  const first = summary.me.name.split(" ")[0];
  $("hello").replaceChildren("Hi ", el("b", {}, first), ", here's your day.");
  renderDay();
  renderTasks();
  renderNotifications();
  setBadge(summary.notifications.unread);
  show("main");
  // Keep "Working since" honest while the popup stays open.
  clearInterval(ticker);
  if (summary.day?.running) {
    ticker = setInterval(() => {
      summary.day.minutes += 1;
      renderDay();
    }, 60000);
  }
}

async function load() {
  show("loading");
  error("main-error", "");
  try {
    summary = await call("/api/extension/summary", settings);
    render();
  } catch (problem) {
    if (problem.status === 401) {
      await forget();
      settings.session = "";
      return showConnect("You're signed out. Sign in again to carry on.");
    }
    show("main");
    if (!summary) {
      $("hello").textContent = "";
      $("day-card").hidden = true;
    }
    error("main-error", problem.message);
  }
}

$("day-button").addEventListener("click", async () => {
  const action = summary.day?.running ? "stop" : "start";
  $("day-button").disabled = true;
  try {
    await call("/api/extension/clock", settings, { method: "POST", body: { action } });
    await load();
  } catch (problem) {
    error("main-error", problem.message);
  } finally {
    $("day-button").disabled = false;
  }
});

$("read-all").addEventListener("click", async () => {
  await call("/api/extension/notifications", settings, { method: "POST", body: {} }).catch(() => {});
  await load();
});

$("refresh").addEventListener("click", load);
$("open-dashboard").addEventListener("click", () => open(dashboard(summary?.me?.home && summary.me.home !== "/" ? summary.me.home : "")));

/* ------------------------------------------------------------ start */

(async () => {
  settings = await loadSettings();
  if (settings.session) await load();
  else showConnect();
})();
