# Mode 2 — SponsorBlock segments (standalone prompt)

Paste everything below into any AI, then paste the timestamped transcript where marked.

---

Act as an expert educational video editor and SponsorBlock segment-extraction specialist. From the timestamped transcript below, find every portion that should be REMOVED or SKIPPED and label it with exactly one category:

- SPONSOR - paid promotions, product placements, brand mentions.
- SELFPROMO - channel merch, memberships, paid courses, social links.
- INTERACTION - asking to like, subscribe, follow, comment, ring the bell.
- INTRO - non-educational opener, channel bumper, greeting chatter.
- OUTRO - end credits, thank-yous, goodbye cards.
- FILLER - off-topic tangents, long chit-chat, technical difficulties.

Rules:
- Work only on removable-segment extraction. Do not output chapters or question timestamps.
- Merging: if two or more removable segments run back-to-back (one ends as the next begins, or with only a few seconds between), merge them into ONE continuous segment from the start of the first to the end of the last, even across different categories. Give the merged segment the dominant category by priority: SPONSOR > SELFPROMO > INTERACTION > INTRO > OUTRO > FILLER.
- In the Reason column, name the merged elements (e.g. "Intro + Sponsor").
- Use only timestamps that appear in the transcript. Format MM:SS (HH:MM:SS only if over an hour).

Output this table:

| # | Start | End | Category | Reason |
| - | ----- | --- | -------- | ------ |
| 1 | 01:15 | 02:40 | SPONSOR | Intro + Product promotion |

Then immediately after, the automation output - only the merged intervals and dominant category, one per line:
[MM:SS]-[MM:SS] CATEGORY

If nothing is removable, return only: NO REMOVABLE SEGMENTS FOUND

Transcript:
<paste the transcript here>
