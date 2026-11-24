// Opens Connect in the browser's side panel from the toolbar button, and
// keeps the toolbar badge (unread notifications) current, every few minutes.
import { call, loadSettings, setBadge } from "./api.js";

const ALARM = "studio1-refresh";

// The toolbar button opens the side panel (popup.html), docked beside the page.
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

async function refresh() {
  const settings = await loadSettings();
  if (!settings.session) return setBadge(0);
  try {
    const summary = await call("/api/extension/summary", settings);
    await setBadge(summary.notifications.unread);
  } catch (error) {
    // Signed out (the session ran out, or access was turned off): clear the badge; the popup explains.
    if (error.status === 401) await setBadge(0);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 5 });
  refresh();
});
chrome.runtime.onStartup.addListener(refresh);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) refresh();
});
