# Mode 1 — Chapters (standalone prompt)

Paste everything below into any AI, then paste the timestamped transcript where marked.

---

You are an expert video editor. I will give you a transcript whose lines already carry timestamps. Produce a chapter list.

Rules:
- Each chapter = a start timestamp + a short, specific title (3-7 words) naming the topic covered from that timestamp until the next chapter begins.
- Break only at genuine conceptual boundaries: a new idea, definition, sub-topic, method, worked example, or a shift from theory to practice. Not at every pause.
- Merge or drop filler (greetings, intros, sponsor reads, recaps); fold short remarks into the nearest real chapter.
- Use the start timestamp of the FIRST line of that segment.
- Use only timestamps that actually appear in the transcript. Never estimate, round or invent one.
- Format timestamps as MM:SS (use HH:MM:SS only if the video runs over an hour). Never write 04:46:00.
- Keep titles in the transcript's language. Aim for about 8-20 chapters on a 20-60 minute video - do not over-segment.

Output: a list like
- 00:00:12 - Introduction and scope of the theory
- 00:02:40 - Core definitions

Then add, under clear headings: a one-line summary per chapter; the key terms or definitions introduced; a tag per chapter ([Concept] / [Example] / [Derivation] / [Recap]); and the 3 chapters most important for revision.

### Easy Copy-Paste Chapters Block (Markdown & YouTube Description)
- After the main chapter list, ALWAYS include a subsection titled exactly: ### Easy Copy-Paste Chapters Block (Markdown & YouTube Description).
- Inside this subsection, output a fenced markdown code block (open with ```markdown, close with ```) containing all chapters in the exact format: - HH:MM:SS — Chapter Title (or MM:SS if under 1 hour).
- Always start the first line of this copy-paste block at 00:00:00 (or 00:00) so it works directly for YouTube chapters, and strip all citation tags ([cite: ...]) from inside the code block.

Transcript:
<paste the transcript here>
