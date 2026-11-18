# Architecture Decision Records (ADR)

## ADR-001: Adopt Single Project Agent Memory Protocol v2.0
- **Date**: 2026-11-13
- **Status**: Accepted
- **Context**: Autonomous and collaborative AI coding assistants need persistent, token-efficient memory and strict safety guardrails without cross-session amnesia or context window bloating.
- **Options**:
  - *Option A: Flat prompt or single unstructured scratchpad* — high token overhead, rapid degradation over long projects.
  - *Option B: Multi-file tiered memory (BRIEF, learning, DECISIONS, EXECUTION_FLOW, summary)* — structured read/write modes, fast cold starts, token lean.
- **Decision**: Implemented Option B using Single Project Protocol v2.0 with tiered memory budgets (Tier A/B/C) and automated defense-in-depth security scanners.
- **Consequences**: Agents load only BRIEF.md on start, grep Tier B files on demand, append to summary.md, and enforce fail-closed git hooks.
- **Revisit when**: Project requirements mandate multi-project monorepo architecture.

## ADR-002: Manual (skill-copy) generation is the default
- **Date**: 2026-11-14
- **Status**: Accepted
- **Context**: Most users of this extension have no AI API key. Requiring one to get any value out of the product excluded the majority of the audience.
- **Options**:
  - *Option A: API-only* — simplest code, but useless without a paid endpoint.
  - *Option B: Manual mode default, API opt-in* — the chapter-writing rules are copied to the clipboard and run in any free AI site; the API path stays available behind a toggle.
- **Decision**: Option B. `generationMode` defaults to `manual`; API mode is opt-in via **Settings → How chapters get written**.
- **Consequences**: In manual mode the AI-provider card and both generate buttons are hidden, `autoGenerate` is forced off, and both generate handlers early-return. `🧠 Copy skill` appears in the Editor.
- **Revisit when**: A hosted free tier exists that removes the need for a user-supplied key.

## ADR-003: Remove the shared transcript API key
- **Date**: 2026-11-18
- **Status**: Accepted
- **Context**: `background.js` shipped `DEFAULT_TRANSCRIPT_API_KEY` as a plain-text constant. It sat in the public repo and inside every released CRX, so anyone could extract it and spend the owner's quota. A client-side extension cannot hide a key.
- **Options**:
  - *Option A: Keep it and allowlist it in the scanner* — CI green, key stays public and abusable.
  - *Option B: Remove it; every user supplies their own* — a real cost for videos without YouTube captions and for embedded players, but no shared credential at all.
- **Decision**: Option B, shipped as a breaking change in 3.9.0. The constant is now `""` and the fetch throws *"No transcript API key configured…"* before any network call.
- **Consequences**: Videos with working YouTube captions are unaffected. Videos without captions and embedded players require the user's own key. The scanner annotation (`scan:allow`) was removed with the key.
- **Revisit when**: A server-side proxy with per-user quotas replaces the client-side key entirely.
