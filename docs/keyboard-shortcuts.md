# Keyboard shortcuts

Every shortcut below is editable. Open the panel, go to **⚙️ Settings → ⌨️ Keyboard shortcuts**, click a box, then press the key you want. The new key saves immediately and applies on every video.

## The list

| Action | Default | Notes |
| --- | --- | --- |
| Open / close the panel | `Alt+M` | Works anywhere on a video page, including fullscreen. |
| Next chapter | `]` | Jumps to the next chapter timestamp. |
| Previous chapter | `[` | Jumps to the previous chapter timestamp. |
| Add a timestamp | `Alt+X` | Drops a marker at the current playback position. |
| Mark sponsor (start/end) | `Alt+S` | Fixed key — press once to set the segment start, again to set the end. |

## Why Alt+M is the default for the panel

YouTube already claims most bare letters — `k` play/pause, `f` fullscreen, `m` mute, `t` theatre, `c` captions, `i` miniplayer, `j`/`l` seek, and the digits for percentage jumps. A bare `m` would fight YouTube's mute, so the panel toggle ships as `Alt+M`, which YouTube leaves alone.

## Notes

- Shortcuts are ignored while you are typing in a text field, so the Editor never swallows your typing.
- While a shortcut is being recorded, the key you press is captured and does not also fire its action.
- Bindings are stored in `chrome.storage.local` under `shortcuts`. New shortcuts added by an update keep working for existing installs, because stored values are merged over the defaults.
