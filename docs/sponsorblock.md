# SponsorBlock

The extension finds the parts of a lecture that are not the lecture, and can upload them to [SponsorBlock](https://sponsor.ajay.app) so every SponsorBlock user skips them too.

## What it detects

| Category | What it matches |
| :--- | :--- |
| `sponsor` | Paid promotion, brand deals, sponsored course discounts, referral pitches |
| `selfpromo` | Channel plugs, merch, "subscribe and join the Telegram" |
| `intro` | Opening greetings, title cards, prayers or slogans before the teaching starts |
| `outro` | Closing thanks, next-video plugs, end cards |
| `preview` | Recap or preview of what is coming later in the same video |
| `interaction` | Reminders to like, comment, share |
| `filler` | Dead air, tangents, repeated housekeeping |

If speech starts at `00:12` rather than `00:00`, the gap is treated as intro/silence and included from `00:00:00`.

## Marking a segment by hand

**Step 1:** Press **Alt + S** at the start of the segment.

**Step 2:** Press **Alt + S** again at the end. The interval is added to the list.

**Step 3:** Adjust the times in the table if the cut is loose.

## Pasting segments

**📥 Paste segments** reads your clipboard and accepts two shapes:

```text
| # | Start | End | Category | Reason |
| 1 | 00:00 | 00:42 | INTRO | Greeting before the lecture |
| 2 | 12:10 | 13:05 | SPONSOR | Course discount promo |
```

```text
[00:00]-[00:42]
[12:10]-[13:05]
```

Both render as cards in one click. Intervals that overlap are merged; duplicates are dropped.

## The 80% safety block

SponsorBlock rejects submissions where removable segments cover 80% or more of the video. The extension checks this **before** sending, and refuses with the exact percentage so you can review the intervals. If your AI marked half the lecture as removable, the prompt is being too aggressive — tighten the categories and re-run.

## Uploading

**Step 1:** Get your **private** user ID from SponsorBlock → *Settings* → *Your profile* → copy the private ID (a 32-character UUID, dashes optional). Not the public one.

**Step 2:** Paste it into **Settings → SponsorBlock private ID**.

**Step 3:** Press **Upload** on the segment list, or enable **Auto upload ads to SponsorBlock**.

The payload sent is `videoID`, `userID`, `service: "YouTube"`, `userAgent`, `videoDuration` and `segments[{ segment: [start, end], category }]` to `POST https://sponsor.ajay.app/api/skipSegments`.

## Upload errors

| Status | Meaning | Fix |
| :--- | :--- | :--- |
| 400 | Malformed payload or bad video ID | Reload the tab; video IDs must be 11 characters |
| 403 | Invalid user ID, or the auto-moderator rejected it | Re-copy the **private** ID; check that the segments are not nonsense |
| 409 | Duplicate or overlapping segments already submitted | Nothing to do — they exist |
| 429 | Rate limited | Wait a minute, then retry |
| Local: "Private User ID is required" | Field empty | Paste the private ID |
| Local: "length is N" | ID too short | Use the full 32-character UUID |
| Local: "Safety Block" | Segments ≥ 80% of the video | Trim the intervals |

## Looking up existing segments

The detector reads `https://sponsor.ajay.app/api/skipSegments` for the current video so it does not propose a segment that is already there.
