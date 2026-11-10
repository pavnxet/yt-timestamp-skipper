# Chapters and filters

## The chapter model

Each question in the video becomes one chapter with up to three timestamps:

| Field | Meaning | Used by |
| :--- | :--- | :--- |
| **Question start** | Where the question is read (including any lead-in) | The `Questions` chip, `Q` markers |
| **Correct option** | Where the answer is revealed, e.g. `(B)` | The `Answers` chip, `A` markers |
| **Explanation start** | Where the discussion of the options begins | The `Explain` chip, `E` markers |

A row may leave a field as `N/A` — a question with no explanation, for example. The auto-comment falls back to the explanation time when the option time is `N/A`.

## Reading the table

The AI returns a Markdown table; the parser converts it into cards. If you edit the table by hand, keep the header and the column order intact — the parser keys on them.

## Section chips

The chips at the top of the **Chapters** tab are independent toggles, not radio buttons.

| Selection | List shows | `]` / `[` jump to |
| :--- | :--- | :--- |
| Questions | Question starts | Question starts |
| Answers | Option reveals | Option reveals |
| Explain | Explanation starts | Explanation starts |
| Questions + Answers | Both | Both, interleaved in video order |
| All (default) | Everything | Everything |

- Turning every chip off falls back to **All** — the list never becomes empty.
- **All** resets to the default selection.
- The filter applies to the progress-bar markers too, so a revision pass shows only answer marks.

Typical use: pick **Questions + Answers** for a timed mock-test revision, then switch to **Explain** when you get one wrong.

## Progress-bar markers

Markers are drawn on YouTube's own progress bar, coloured per section. Hovering shows the label; clicking seeks. They are re-drawn when the filter changes, when chapters are regenerated, and after YouTube's SPA navigation.

## Auto-scroll

The chapter list tracks playback: the current chapter is highlighted and scrolled into view. This is a scroll, not a seek — it never moves the video.

## Playback modes

| Mode | Behaviour |
| :--- | :--- |
| Normal | Ordinary YouTube playback |
| Chapter loop | Repeats the current chapter until you turn it off |

Chapter loop is for drilling one hard derivation or one long explanation.

## Editing and re-running

- **Editor** → edit the transcript or the table → **Generate** again.
- **📋 Copy** puts the current table on the clipboard.
- **📥 Paste** accepts a table you built elsewhere (the same format the toolkit prompts produce).
- **☁️ Save** writes the current list to Turso, overwriting the stored list for that video ID.
