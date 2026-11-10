# Keyboard shortcuts

| Key | Action | Rebindable |
| :--- | :--- | :--- |
| `]` | Next chapter | Yes |
| `[` | Previous chapter | Yes |
| `Alt + X` | Add the current time as a note marker | Yes |
| `Alt + S` | Start / end a sponsor segment | No |
| `Esc` | Close the dashboard | No |

"Next" and "previous" follow the **section filter** — with only **Answers** selected, `]` lands on the next correct-option reveal.

## Rebinding

**Step 1:** Open **Settings → Shortcuts**.

**Step 2:** Click the field for next, previous or add-note.

**Step 3:** Press the key you want. `Alt` is captured along with it for the note key.

**Step 4:** Save. Bindings persist in `chrome.storage.local` under `shortcuts` as `{ next, prev, add, addAlt }`, using `KeyboardEvent.code` values (`BracketRight`, `KeyJ`, …).

## Conflicts

| Conflict | Result | Fix |
| :--- | :--- | :--- |
| YouTube's own shortcuts (`k`, `j`, `l`, `f`) | Both fire | Pick a key with a modifier |
| The key also types into a field | Ignored while an input is focused | Click outside the panel first |
| Browser shortcut (e.g. `Ctrl+T`) | Browser wins | Choose an unmodified letter or `Alt` combo |

Bindings use `KeyboardEvent.code`, so they follow physical key position, not the character produced by your layout. `]` on a US layout is `BracketRight`; on another layout, rebind by pressing the key once.
