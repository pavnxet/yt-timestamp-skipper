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
