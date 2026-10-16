---
name: youtube-transcript-toolkit
description: Three-in-one toolkit for a timestamped YouTube / lecture / podcast transcript. Mode 1 builds a chapter map — a start timestamp plus a short concept-level title for each segment, with optional study aids. Mode 2 extracts SponsorBlock removable segments (SPONSOR, SELFPROMO, INTERACTION, INTRO, OUTRO, FILLER) as a table plus merged [MM:SS]-[MM:SS] CATEGORY intervals. Mode 3 extracts per-question MCQ timestamps (question start, correct-option reveal, answer start, correct option letter). Use this skill whenever the user shares a transcript whose lines carry timestamps and wants chapters, a table of contents, a study outline, chapter markers, SponsorBlock / skippable / sponsored segments to cut, or MCQ / question timestamps — even if they only say "organise this transcript" or "process this video transcript". Trigger it for any timestamped-transcript request, not just ones that use the word "chapter".
---

# YouTube Transcript Toolkit

One skill, three independent jobs over the same input: a transcript whose lines already carry timestamps. Each job reads the whole transcript and returns a different structure.

## Pick the mode

- **Chapters** — the user wants the video organised: chapters, a table of contents, a study outline, chapter markers, or a YouTube description chapter list.
- **SponsorBlock segments** — the user wants the parts to *skip or cut*: sponsors, self-promo, like/subscribe asks, intros, outros, filler.
- **MCQ / question timestamps** — the user wants every question in an exam-prep or problem-solving video indexed: question start, correct-option reveal, answer start, correct option.

If the user asks for more than one, run each mode as its **own separate pass, in isolation**, then present the outputs under clear headings (Chapters / SponsorBlock / Questions). Each mode has a strict output format — keep it exact and do not blend one mode's output into another.

The exact standalone wording for each mode lives in `references/`:
- `references/chapters-prompt.md`
- `references/sponsorblock-prompt.md`
- `references/mcq-timestamps.md`

Read the relevant reference when you want the precise prompt to hand to a model or to paste to the user.

## Get the transcript (all modes)

- If the user pasted it, use it directly.
- If it is a file (`.txt`, `.srt`, `.vtt`, `.md`), read it with `read_file`.
- If it is a YouTube URL, fetch the transcript if a tool allows; otherwise ask the user to paste it.
- If the transcript has **no timestamps**, say so plainly — you cannot invent them. Offer a structure-only outline (topic order without times) instead.

## Shared rules

- **Read the whole transcript before producing anything.** Structure that comes from understanding the flow is far better than line-by-line output.
- **Use only timestamps that actually appear in the transcript.** Never estimate, round, or invent one.
- **Format** timestamps as `MM:SS`; use `HH:MM:SS` only when the video runs over an hour. Never write `04:46:00`.
- **Language:** keep titles/labels in the transcript's language unless the user asks otherwise.
- **Long transcripts:** process in overlapping chunks (carry the last ~10 lines of one chunk into the next as context), then merge and de-duplicate so nothing repeats and order stays monotonic.

---

## Mode 1 — Chapters

Produce a chapter list: each chapter = a **start timestamp** + a **short, specific title** (3–7 words) naming the topic covered from that timestamp until the next chapter begins.

- Break only at genuine conceptual boundaries — a new idea, definition, sub-topic, method, worked example, or a shift from theory to application. Not at every timestamp or pause.
- Merge or drop filler (greetings, intros, sponsor reads, recaps); fold a short relevant remark into the nearest real chapter.
- Assign the start timestamp = the timestamp of the *first* line of that segment.
- Self-check: strictly increasing, no overlaps, no invented times, unique descriptive titles, whole content covered.
- Aim for roughly 8–20 chapters on a 20–60 minute video. Over-segmenting is the common failure — resist it.

Default output — a list, then study aids:

```
- 00:00:12 — Introduction and scope of the theory
- 00:02:40 — Core definitions
- 00:06:15 — First principle and its assumptions
```

Study aids (add unless told otherwise): a one-line summary per chapter; the key terms/definitions introduced; a tag per chapter (`[Concept]` / `[Example]` / `[Derivation]` / `[Recap]`); and the 3 chapters most important for revision.

If the user wants machine-readable output, emit JSON: `[{"start":"00:02:40","title":"Core definitions","summary":"...","type":"Concept"}]`

---

## Mode 2 — SponsorBlock segments

Act as an expert educational video editor and SponsorBlock segment-extraction specialist. Find every portion that should be **removed or skipped**, and label it with exactly one category:

- **SPONSOR** — paid promotions, product placements, brand mentions.
- **SELFPROMO** — channel merch, memberships, paid courses, social links.
- **INTERACTION** — asking to like, subscribe, follow, comment, ring the bell.
- **INTRO** — non-educational opener, channel bumper, greeting chatter.
- **OUTRO** — end credits, thank-yous, goodbye cards.
- **FILLER** — off-topic tangents, long chit-chat, technical difficulties.

**Scope:** in this mode work *only* on removable-segment extraction — do not output chapters or question timestamps.

**Merging rule:** if two or more removable segments run back-to-back (one ends as the next begins, or with only a few seconds between), merge them into **one** continuous segment from the start of the first to the end of the last — even across different categories. Give the merged segment the dominant category by priority:

`SPONSOR > SELFPROMO > INTERACTION > INTRO > OUTRO > FILLER`

In the Reason column, name the merged elements (e.g. "Intro + Sponsor", "Selfpromo + Like/Subscribe").

Output the table:

| # | Start | End | Category | Reason |
| - | ----- | --- | -------- | ------ |
| 1 | 01:15 | 02:40 | SPONSOR | Intro + Product promotion |

Then, immediately after, the automation output — only the merged intervals and dominant category, one per line:

```
[MM:SS]-[MM:SS] CATEGORY
```

If nothing is removable, return only: `NO REMOVABLE SEGMENTS FOUND`

---

## Mode 3 — MCQ / question timestamps

Act as a high-precision MCQ timestamp extractor. Find every distinct multiple-choice question, problem-solving item, or question discussion and return its timestamps.

For each question (kept in video order) capture:
- **Question Start** — where the question begins.
- **Correct Option Timestamp** — where the correct option is revealed/highlighted, or `N/A`.
- **Answer Start** — where the detailed solution/explanation begins, or `N/A`.
- **Correct Option** — a single letter (`A`, `B`, `C`, `D`) or `Unclear`.

Output **only** this table — no preamble, no code fences:

| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| Q1 | 04:46          | 06:54                    | 05:07        | B              |

Edge cases: if there are no questions, return the header row alone; if a timestamp is missing write `N/A`, if the option is unstated write `Unclear`; never guess.
