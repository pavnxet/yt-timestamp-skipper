# Turso (libSQL) sync

Turso is a hosted SQLite (libSQL) service. Point the extension at your own database and every chapter list is saved server-side — regenerate nothing when you switch devices, and spend no AI credits twice.

## Why bother

| Without Turso | With Turso |
| :--- | :--- |
| Lists live in one browser profile | Same list on every device |
| Clearing site data loses everything | Database keeps it |
| Reopening a video may mean a new AI call | List loads instantly from the DB |

## Create the database

**Step 1:** Sign up at [turso.tech](https://turso.tech) and install the CLI, or use the dashboard.

**Step 2:** Create a database.

```bash
turso db create yt-chapters
```

**Step 3:** Copy the URL.

```bash
turso db show yt-chapters --url
# libsql://yt-chapters-yourname.turso.io
```

**Step 4:** Create a token.

```bash
turso db tokens create yt-chapters
```

## Connect the extension

**Step 1:** Open **Settings → Turso Database**.

**Step 2:** Paste the `libsql://…` URL and the token.

**Step 3:** Save. The table is created automatically on first use:

```sql
CREATE TABLE IF NOT EXISTS video_timestamps (
  video_id   TEXT PRIMARY KEY,
  timestamps TEXT
);
```

No manual migration, no schema file to run.

## How a save works

**Step 1:** The chapter list is serialised to JSON.

**Step 2:** The service worker POSTs to `<your-db-url>/v2/pipeline` with `Authorization: Bearer <token>` — the standard Turso HTTP pipeline endpoint, so no libSQL driver is bundled.

**Step 3:** The statement upserts by `video_id`, so a re-save replaces the old list instead of duplicating it.

**Step 4:** If **Post timestamps as a comment** is on, the comment is posted after a successful write.

## Loading

Open a video you have saved before and the list is fetched by video ID. Nothing is regenerated. If you want fresh chapters anyway, press **Generate** — it overwrites.

## Security notes

- The token is stored in `chrome.storage.local`, readable by anything with access to your browser profile. Use a **database-scoped** token, not an account token.
- The database is yours; the extension has no proxy and no shared backend.
- Revoke a token with `turso db tokens revoke` if you ever paste it somewhere public.

## Troubleshooting

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `401 Unauthorized` | Wrong or expired token | Re-issue a database token |
| `404` on `/v2/pipeline` | URL is the CLI endpoint, not the HTTP one | Use `libsql://…` from `turso db show --url` |
| Saves silently do nothing | URL has a trailing space | Re-paste both fields |
| Works on one machine only | Different browser profile | Same URL + token on the other machine |
