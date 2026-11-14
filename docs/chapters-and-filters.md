# Chapters, markers and filters

## The Editor is the source of truth

The **📝 Editor** tab holds one timestamp per line. Every change re-parses instantly and updates the chapter list, the seek-bar markers and the skip targets.

## The chapter card

When playback crosses a chapter timestamp, a small glass card rises out of the seek bar, anchored above that chapter's marker, showing the chapter name. It dismisses itself after about 3.6 seconds and never takes a click.

- Works in fullscreen and theatre mode.
- Follows your active filter — filter to Questions only and only questions raise a card.
- Turn it off in **Settings → Show chapter card during playback**.

## Hovering a marker

Hover any chapter marker on the seek bar to see `2:29:15 │ Q38: Question Start (Ans: D: 75s)` — the chapter's own timestamp, then its name. The probe listens on the progress bar rather than the markers, so seek-dragging is untouched.

## Filters

Chips for **Questions**, **Answers** and **Explain** toggle independently, so you can show only question starts, only answer reveals, or any combination. **All** resets.

## How chapters are detected

Playback is sampled about four times a second and compared against the previous sample. A chapter fires when its timestamp falls between the two samples. A jump larger than 1.5 seconds is treated as a seek, so scrubbing across ten chapters raises no cards at all.
