# Studio1 Connect on the Chrome Web Store

Everything the store's developer dashboard asks for, in the order of its tabs. Studio1 Connect is **Unlisted**: only people with the link can install it, and only Studio1 team members (and invited writers) can sign in.

Dashboard: https://chrome.google.com/webstore/devconsole

## One time: the developer account

1. Sign in with a **Studio1 Google account**, not a personal one, and pay the one-time US$5 registration fee.
2. **Account** tab: add and verify the contact email. Answer the trader question: Studio1 is a business, so the answer is most likely "trader". The store then asks for a business address and phone number, which it shows to people in the EU.
3. Optional: to let a second founder manage the listing too, publish from a Google Group ("group publisher") instead of one person's account.

## Package

```sh
pnpm extension:store
```

Upload `extension/dist/studio1-connect-<version>-store.zip`. It has `manifest.json` at the top (the store refuses a zip with it in a folder), and leaves out the local dev addresses, so it asks for `dashboard.studio1hq.com` only.

**For every later update:** raise `version` in `extension/connect/manifest.json`, then run `pnpm extension:store` and `pnpm extension:zip`. Upload the new zip under **Package** and submit it for review. Once it's approved, everyone's copy updates on its own.

## Store listing

- **Name and summary:** taken from the manifest ("Studio1 Connect"; "Your Studio1 tasks, day clock and notifications, from the browser toolbar.").
- **Category:** Productivity › Workflow & Planning
- **Language:** English
- **Store icon (128×128):** `extension/connect/icons/icon-128.png`
- **Screenshots (1280×800):** `extension/store/screenshot-1.png` to `screenshot-5.png`. They show sample data (a made-up teammate and tasks), not real people.
- **Small promo tile (440×280):** `extension/store/promo-small-440x280.png`
- **Marquee promo tile:** leave empty (it's only used for featured items).
- **Homepage URL:** https://www.studio1hq.com
- **Support URL:** leave empty. Team members ask inside Studio1.

**Description:**

```text
Studio1 Connect puts your Studio1 dashboard in your browser's side panel, so your day is one click away from any tab.

It's for Studio1 team members: sign in with your Studio1 work email and the code we send you, the same way you sign in to the dashboard.

What you can do
• Start and stop your day clock, and see the hours you've logged today
• See your tasks for today or any other day, and tick them off
• Change a task's progress (Not started, In progress, In review, Done) in one click
• Add a task for today or a day later this month
• Read your dashboard notifications, with an unread count on the toolbar icon
• Open the dashboard or your tasks when you need the full view

Private by design
• Talks only to dashboard.studio1hq.com
• Keeps nothing but your sign-in session and email, in your browser, until you sign out
• No analytics, no ads, and it doesn't read the other sites you visit

Works in Chrome, Edge, Brave and Arc.
```

## Privacy practices

**Single purpose:**

```text
Studio1 Connect shows a Studio1 team member their own tasks, day clock and notifications from the Studio1 team dashboard (dashboard.studio1hq.com) in the browser's side panel, and lets them update them there.
```

**Permission justifications:**

| Permission                                          | Justification                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                                           | Keeps the person's sign-in session and email address in extension storage, so they stay signed in (for up to 7 days) until they sign out.                                                                                                                                            |
| `alarms`                                            | Refreshes the unread-notification count on the toolbar icon every 5 minutes.                                                                                                                                                                                                         |
| `sidePanel`                                         | The extension's interface is a side panel, opened from the toolbar button beside the page the person is on.                                                                                                                                                                          |
| Host permission `https://dashboard.studio1hq.com/*` | The extension's only server. It signs the person in, loads their tasks, day clock and notifications, and saves their changes through the dashboard's API at this address. A small script on the dashboard's own pages tells them Connect is installed, so the dashboard can show it. |

**Remote code:** "No, I am not using remote code." Every script is in the package.

**Data usage:** tick these and nothing else:

- **Personally identifiable information:** name and work email address
- **Authentication information:** the emailed sign-in code and the session it returns
- **Personal communications:** notification text, which can include a teammate's comment

Then tick all three statements: the data isn't sold or transferred to third parties, isn't used for anything unrelated to the single purpose, and isn't used for creditworthiness or lending.

**Privacy policy URL:** https://dashboard.studio1hq.com/connect/privacy. It's the extension's own policy (app/internal/connect/privacy), kept apart from the business site's /privacy. It opens without signing in so reviewers can read it, and like the rest of the dashboard host it's never indexed. If the extension starts handling anything new, update that page in the same change.

## Distribution

- **Payments:** free
- **Visibility:** **Unlisted**
- **Regions:** all regions

## Test instructions (for the reviewer)

```text
Studio1 Connect is an internal tool for the Studio1 team. Only people on the Studio1 team list can sign in: the extension asks for a work email and emails a one-time code to it, the same sign-in as our team dashboard (dashboard.studio1hq.com). There is no public sign-up.

Without an account, the extension shows its sign-in screen. An address outside the team gets: "Use your @studio1hq.com address. Writers from outside Studio1 need an invite from an admin first."

The screenshots show the signed-in views (tasks, notifications, profile) with sample data. If you need to see them live, reply to this email and we will set up a reviewer account for you.
```

## After approval

- Share the listing link (`https://chromewebstore.google.com/detail/<id>`) with the team, and put it on the dashboard's Connections page in place of the zip download.
- Anyone who loaded the zip with "Load unpacked" should remove that copy and install from the store. The store copy has its own ID, so they sign in once more.

## Remaking the images

The screenshots were made by loading the store zip as a real extension in Chromium with sample data, then placing each view in a 1280×800 frame. To change them, swap in your own screenshots under the same names: 1280×800 or 640×400, PNG or JPEG, no transparency.
