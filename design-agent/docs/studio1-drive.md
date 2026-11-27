# Studio1 Design: decks in Google Slides

After a deck is built, `studio1_worker/drive.py` uploads the `.pptx` to a Google Drive folder.
Google converts it to Google Slides, and the link opens a copy a founder can edit. Run every
command from the `design-agent` folder.

## Why a person signs in

A service account has no Drive storage of its own, and shared drives need Google Workspace. So one
shared Studio1 Google account signs in once, and after that the agent uploads into a folder it
created itself.

## One-time setup in Google Cloud

1. Open the Google Cloud console, pick or create a project, and turn on the Google Drive API
   (APIs and Services, Library).
2. Set up the OAuth consent screen (Google Auth Platform). If the shared account is a Google
   Workspace account, choose the Internal user type. Otherwise choose External.
3. Add one scope: `https://www.googleapis.com/auth/drive.file`. Nothing else.
4. Publish the app. An External app left in "Testing" status has its refresh tokens expire after 7
   days, so the agent would lose its sign-in every week. Move it to "In production" (it will show
   an unverified-app screen at sign-in, which is fine for one trusted account), or use Internal.
5. Create credentials, OAuth client ID, application type "Desktop app". Copy the client ID and
   the client secret.

## Settings

Put these in `.env` or the shell that starts the worker.

| Setting | What it is |
| --- | --- |
| `STUDIO1_DRIVE_CLIENT_ID` | The desktop app client ID. Required |
| `STUDIO1_DRIVE_CLIENT_SECRET` | The client secret. Required |
| `STUDIO1_DRIVE_FOLDER_NAME` | Name of the folder the agent creates. Default `Studio1 Design decks` |
| `STUDIO1_DRIVE_SHARE_WITH` | Comma-separated emails who get edit access to the folder |

## Sign in once

```bash
uv run python -m studio1_worker.drive login
```

It prints an address and tries to open the browser. Sign in with the shared account and accept the
Drive access. The page redirects to `127.0.0.1` on this machine, the command saves the sign-in to
`workspace/state/drive/token.json` (owner-only file), and it stops listening. It waits five
minutes at most. Run it on the machine that will run the worker, with a browser.

## Upload a deck

```bash
uv run python -m studio1_worker.drive upload workspace/out/lead-acme-cloud/deck.pptx --title "Acme Cloud intro deck"
uv run python -m studio1_worker.drive status
uv run python -m studio1_worker.drive logout     # revokes the sign-in with Google, deletes the token
```

The first upload creates the folder and shares it with each address in `STUDIO1_DRIVE_SHARE_WITH`
as an editor, without Google's notification mail. It prints the Slides link.

From code: `drive.configured()`, `drive.signed_in()` and `drive.upload_deck(path, title)`, which
returns `{"id": ..., "url": ...}`.

## Rules it keeps

- Every upload is a new file. The title ends with a UTC time stamp. It never overwrites, updates
  or deletes a Drive file, so a founder's hand edits are safe.
- The same file bytes uploaded again return the earlier link instead of a new file.
  `workspace/state/drive/uploads.jsonl` records time, file name, hash, Drive id and link (no tokens).
- The folder is shared only with the listed people. It never makes an "anyone with the link" share.
- Only `.pptx` regular files up to 100 MiB are accepted. Symbolic links are refused.

## What the agent can and cannot see

The `drive.file` scope covers only files and folders this app created. It cannot list, read or
change anything else in the account's Drive. If someone moves or deletes the folder, the next
upload makes a new one and shares it again. If Google reports the sign-in as expired or revoked,
run `login` again.
