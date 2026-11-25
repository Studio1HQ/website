// Runs on the dashboard's own pages only. Tells the Connections page that
// Connect is installed in this browser, and whether it's signed in (and as
// whom), so the page can skip the install steps. Nothing else is shared:
// the session itself never leaves the extension.
function mark({ session = "", email = "" }) {
  const root = document.documentElement;
  root.dataset.studio1Connect = session ? "signed-in" : "installed";
  if (session && email) root.dataset.studio1ConnectEmail = email;
  else delete root.dataset.studio1ConnectEmail;
}

chrome.storage.local.get(["session", "email"]).then(mark);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("session" in changes || "email" in changes)) return;
  chrome.storage.local.get(["session", "email"]).then(mark);
});
