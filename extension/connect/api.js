// Talking to the Studio1 dashboard as the signed-in person. Shared by the
// popup and the background worker. Signing in works like the dashboard's
// own (an emailed code); the 7-day session it gives lives only in this
// browser's extension storage, and nothing is stored on the dashboard.

export const DEFAULT_SERVER = "https://dashboard.studio1hq.com";
export async function loadSettings() {
  const { session = "", server = DEFAULT_SERVER } = await chrome.storage.local.get(["session", "server"]);
  return { session, server: server || DEFAULT_SERVER };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

export async function forget() {
  await chrome.storage.local.remove(["session", "email", "key"]);
  await chrome.action.setBadgeText({ text: "" });
}

/** A JSON request as the connected person. Throws { status, message } on failure. */
export async function call(path, { session, server }, options = {}) {
  let response;
  try {
    response = await fetch(`${server.replace(/\/+$/, "")}${path}`, {
      method: options.method || "GET",
      headers: {
        ...(session ? { authorization: `Bearer ${session}` } : {}),
        ...(options.body ? { "content-type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw { status: 0, message: "Can't reach the dashboard. Check your connection." };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw { status: response.status, message: data.message || data.error || "Something went wrong. Try again." };
  return data;
}

/** The toolbar badge: unread notifications, in Connect's orange. */
export async function setBadge(unread) {
  await chrome.action.setBadgeBackgroundColor({ color: "#ff6136" });
  await chrome.action.setBadgeText({ text: unread > 0 ? (unread > 99 ? "99+" : String(unread)) : "" });
}
