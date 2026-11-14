# Tool & Dependency Catalog

## Vetted Tools

### python-standard-library
- **Purpose**: Zero-dependency cross-platform execution for sensitive data scanning and git hooks.
- **Version / install**: Built-in Python 3.8+ (checked 2026-11-13)
- **Score**: 38/40 (Fit 5 · License 5 · Integration 5 · Perf 5 · Maint 5 · Docs 5 · Security 5 · Alts 3) · unverified: none
- **Gotchas**: Requires Python 3 available on PATH.

## Rejected Tools

- **pre-commit (pip package)**: Adds third-party Python runtime and virtualenv overhead for simple git hook execution (2026-11-13). Native `core.hooksPath` with standalone Python script provides lighter, zero-dependency behavior.
