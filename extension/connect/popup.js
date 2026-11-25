import { DEFAULT_SERVER, call, forget, loadSettings, saveSettings, setBadge } from "./api.js";

const $ = (id) => document.getElementById(id);

// Opened as the toolbar dropdown (a browser without side panels, or an old
// install) rather than the side panel: keep the dropdown's fixed width.
if (chrome.extension?.getViews?.({ type: "popup" }).includes(window)) document.body.classList.add("as-popup");
let settings = { session: "", server: DEFAULT_SERVER };
let pendingEmail = "";
let summary = null;
/** The day whose tasks show ("" = today). */
let shownDay = "";
let photoFor = "";
/** True when the dashboard hasn't the latest update yet (no day view, no adding). */
let legacy = false;
let pane = "tasks";
let ticker = 0;

function show(view) {
  document.body.dataset.view = view;
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
    settings = { session: signedIn.session, server, email: signedIn.email };
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

const STATUSES = [
  { value: "todo", label: "Not started" },
  { value: "doing", label: "In progress" },
  { value: "review", label: "In review" },
  { value: "done", label: "Done" },
];
const statusLabel = (value) => STATUSES.find((item) => item.value === value)?.label ?? value;

function statusPill(value) {
  return el("span", { class: `status status-${value}` }, el("span", { class: "status-dot" }), statusLabel(value));
}

/** Saves a task's new status; the list shows it at once and goes back if it fails. */
async function setStatus(task, status) {
  const before = task.status;
  if (before === status) return;
  task.status = status;
  renderTasks();
  try {
    await call("/api/extension/tasks", settings, { method: "POST", body: { id: task.id, status } });
  } catch (problem) {
    task.status = before;
    renderTasks();
    error("main-error", problem.message);
  }
}

/** The small status menu under a task's pill, like the dashboard's. */
function openStatusMenu(anchor, task) {
  closeMenus();
  const menu = el(
    "div",
    { class: "status-menu", role: "menu" },
    ...STATUSES.map((option) =>
      el(
        "button",
        {
          type: "button",
          role: "menuitemradio",
          "aria-checked": String(option.value === task.status),
          class: option.value === task.status ? "status-option on" : "status-option",
          onclick: (event) => {
            event.stopPropagation();
            closeMenus();
            setStatus(task, option.value);
          },
        },
        statusPill(option.value),
      ),
    ),
  );
  anchor.parentElement.append(menu);
  setTimeout(() => document.addEventListener("click", closeMenus, { once: true }), 0);
}

function closeMenus() {
  for (const menu of document.querySelectorAll(".status-menu")) menu.remove();
}

function renderTasks() {
  const list = $("tasks");
  list.replaceChildren();
  const left = summary.tasks.filter((task) => task.status !== "done").length;
  $("task-count").textContent = summary.tasks.length ? `${summary.tasks.length - left}/${summary.tasks.length}` : "0";
  $("task-count").title = "Done of this day's tasks";
  if (!summary.tasksOk) return list.append(el("li", { class: "empty" }, "Couldn't load your tasks."));
  if (!summary.tasks.length) {
    const onToday = !summary.shown || summary.shown === summary.today;
    return list.append(el("li", { class: "empty" }, onToday ? "Nothing on today yet. Add one below." : "Nothing on this day yet."));
  }
  for (const task of summary.tasks) {
    const done = task.status === "done";
    // The tick: done, or back to where it was.
    const check = el("button", {
      class: done ? "check done" : "check",
      title: done ? "Mark not done" : "Mark done",
      "aria-label": `${done ? "Mark not done" : "Mark done"}: ${task.title}`,
      onclick: () => setStatus(task, done ? "doing" : "done"),
    });
    const pill = el(
      "button",
      {
        type: "button",
        class: "status-button",
        "aria-haspopup": "menu",
        "aria-label": `Progress: ${statusLabel(task.status)}. Change`,
        onclick: (event) => {
          event.stopPropagation();
          openStatusMenu(pill, task);
        },
      },
      statusPill(task.status),
    );
    const meta = el("span", { class: "item-meta" }, pill);
    if (task.late && !done) meta.append(el("span", { class: "item-sub late" }, `Late · due ${shortDate.format(new Date(`${task.due_on}T00:00:00Z`))}`));
    if (task.blocked && !done) meta.append(el("span", { class: "item-sub late" }, "Blocked"));
    list.append(
      el(
        "li",
        { class: done ? "is-done" : "" },
        check,
        el(
          "div",
          { class: "item" },
          el(
            "a",
            { class: "item-title", href: "#", onclick: (event) => (event.preventDefault(), open(dashboard("/tasks"))) },
            task.title,
          ),
          meta,
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
  $("unread-count").hidden = unread === 0;
  $("dock-badge").hidden = unread === 0;
  $("dock-badge").textContent = unread > 9 ? "9+" : String(unread);
  $("unread-count").textContent = unread > 99 ? "99+" : String(unread);
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

/* ------------------------------------------------------------ welcome */

function greeting() {
  // The viewer's own clock: late night, morning, afternoon, evening.
  const hour = new Date().getHours();
  return hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 22 ? "Good evening" : "Good night";
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";
}

async function renderWelcome() {
  const { me } = summary;
  $("welcome-hi").textContent = greeting();
  $("welcome-name").textContent = me.name;
  $("welcome-role").textContent = me.role || me.email;
  $("avatar-initials").textContent = initials(me.name);
  $("profile-name").textContent = me.name;
  $("profile-email").textContent = me.email;
  $("profile-role").textContent = me.role ? `${me.role} · ` : "";
  syncProfileAvatar();
  // Their photo, fetched once: from the extension's photo route with the
  // session, or, from a dashboard without that route yet, the dashboard's
  // own photo link (works when they're signed in to it in this browser).
  if (me.hasPhoto === false || photoFor === me.email) {
    if (me.hasPhoto === false) $("avatar-img").hidden = true;
    return;
  }
  photoFor = me.email;
  try {
    const response = me.hasPhoto
      ? await fetch(dashboard("/api/extension/photo"), { headers: { authorization: `Bearer ${settings.session}` } })
      : await fetch(dashboard(`/team-file/photo/${encodeURIComponent(me.email)}`), { credentials: "include" });
    if (!response.ok || !(response.headers.get("content-type") || "").startsWith("image/")) return;
    $("avatar-img").src = URL.createObjectURL(await response.blob());
    $("avatar-img").hidden = false;
    syncProfileAvatar();
  } catch {
    // Initials stay.
  }
}

/** The Profile section's large avatar: the same photo or initials. */
function syncProfileAvatar() {
  const img = $("avatar-img");
  $("profile-avatar").replaceChildren(img.hidden ? el("span", {}, $("avatar-initials").textContent) : el("img", { src: img.src, alt: "" }));
}

/* ------------------------------------------------------------ sections */

const PANES = ["tasks", "inbox", "me"];

function setPane(next) {
  pane = next;
  document.body.dataset.pane = next;
  for (const name of PANES) $(`pane-${name}`).hidden = name !== next;
  for (const item of document.querySelectorAll(".dock-item")) {
    const on = item.dataset.pane === next;
    item.classList.toggle("on", on);
    item.setAttribute("aria-selected", String(on));
  }
  if (next === "tasks") renderDays();
}

for (const item of document.querySelectorAll(".dock-item")) item.addEventListener("click", () => setPane(item.dataset.pane));

// A sideways swipe across the panel moves to the next or previous section.
let swipeX = null;
let swipeY = 0;
$("panes").addEventListener("pointerdown", (event) => {
  if (event.target.closest(".days, input, button, a")) return;
  swipeX = event.clientX;
  swipeY = event.clientY;
});
$("panes").addEventListener("pointerup", (event) => {
  if (swipeX === null) return;
  const dx = event.clientX - swipeX;
  const dy = event.clientY - swipeY;
  swipeX = null;
  if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
  const index = PANES.indexOf(pane) + (dx < 0 ? 1 : -1);
  if (index >= 0 && index < PANES.length) setPane(PANES[index]);
});

/* ------------------------------------------------------------ days */

function addDays(day, count) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/** Two weeks back to two weeks ahead, a chip a day, scrolling sideways; the chosen day in view. */
function renderDays() {
  const today = summary.today;
  const current = summary.shown || today;
  const strip = $("days");
  strip.replaceChildren(
    ...Array.from({ length: 29 }, (_, index) => {
      const day = addDays(today, index - 14);
      const date = new Date(`${day}T00:00:00Z`);
      const first = date.getUTCDate() === 1 || index === 0;
      return el(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": String(day === current),
          "data-day": day,
          class: ["day-chip", day === current ? "on" : "", day === today ? "today" : "", day < today ? "past" : ""].join(" ").trim(),
          onclick: () => {
            shownDay = day === today ? "" : day;
            load();
          },
        },
        el("span", { class: "day-chip-name" }, day === today ? "Today" : first ? monthShort.format(date) : weekday.format(date)),
        el("span", { class: "day-chip-date" }, String(date.getUTCDate())),
      );
    }),
  );
  // Keep the chosen day in the middle of the strip.
  // After the view is on screen (a hidden strip has no width to scroll in).
  requestAnimationFrame(() => {
    const chosen = strip.querySelector(".day-chip.on");
    if (!chosen) return;
    strip.style.scrollBehavior = "auto";
    strip.scrollLeft = chosen.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + chosen.offsetWidth / 2;
    strip.style.scrollBehavior = "";
  });
  const label = longDay.format(new Date(`${current}T00:00:00Z`));
  $("tasks-title").textContent = current === today ? `Today · ${label}` : label;
  $("add-input").placeholder = legacy
    ? "Adding arrives with the next update"
    : current === today
      ? "Add a task for today"
      : `Add a task for ${label}`;
  $("add-input").disabled = legacy;
}

function render() {
  renderWelcome();
  renderDays();
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
  // The loading screen only the first time; after that the view stays while it refreshes.
  if (!summary) show("loading");
  // The refresh arrow turns while it fetches, so a click always shows.
  $("refresh").classList.add("spinning");
  $("refresh").disabled = true;
  const started = Date.now();
  error("main-error", "");
  try {
    summary = await call(`/api/extension/summary${shownDay ? `?day=${shownDay}` : ""}`, settings);
    // An older dashboard sends today's late and undated tasks too, and ignores
    // the day asked for: keep just the tasks dated the day showing.
    legacy = !summary.shown;
    if (!summary.shown) {
      summary.shown = shownDay || summary.today;
      summary.tasks = summary.tasks.filter((task) => task.due_on === summary.shown);
    }
    render();
  } catch (problem) {
    if (problem.status === 401) {
      await forget();
      settings.session = "";
      return showConnect("You're signed out. Sign in again to carry on.");
    }
    show("main");
    if (!summary) $("day-card").hidden = true;
    error("main-error", problem.message);
  } finally {
    // At least half a turn, so a quick refresh is still seen.
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 500 - (Date.now() - started))));
    $("refresh").classList.remove("spinning");
    $("refresh").disabled = false;
    $("refresh").title = `Refresh · updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
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

// Add a task on the day that's showing.
$("add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("add-input").value.trim();
  if (!title) return;
  $("add-button").disabled = true;
  error("main-error", "");
  try {
    await call("/api/extension/tasks", settings, { method: "POST", body: { title, day: summary?.shown || summary?.today } });
    $("add-input").value = "";
    await load();
    $("add-input").focus();
  } catch (problem) {
    error("main-error", problem.message);
  } finally {
    $("add-button").disabled = false;
  }
});

$("refresh").addEventListener("click", load);
$("open-dashboard").addEventListener("click", () => open(dashboard(summary?.me?.home && summary.me.home !== "/" ? summary.me.home : "")));
$("open-tasks").addEventListener("click", () => open(dashboard("/tasks")));

/* ------------------------------------------------------------ start */

(async () => {
  settings = await loadSettings();
  if (settings.session) await load();
  else showConnect();
})();
