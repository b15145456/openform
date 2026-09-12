# OpenForm

OpenForm is a specification-driven platform for defining forms and exchanging structured records.

> **Source of Truth:** `b15145456/openform` is the authoritative record for OpenForm specifications, architecture decisions, exchange-language definitions, release notes, and project history.

## Core Principle

OpenForm separates **definition generation** from **runtime execution**.

Users may explicitly use an LLM to read a specification and generate an OpenForm Definition. OpenForm runtime does **not automatically call an LLM** to render, validate, store, or exchange records.

```text
Specification
     |
     | explicit authoring / generation
     v
LLM or other authoring tool
     |
     v
OpenForm Definition
     |
     +--> Render Form
     +--> Validate Input
     +--> Produce Structured Record
     +--> Exchange with other software
```

Generated definitions are reviewable, versioned, testable, and reusable artifacts.

## Documentation

- `docs/product-spec.md` — product scope and behavior
- `docs/architecture.md` — architecture and boundaries
- `docs/openform-definition.md` — form-definition contract
- `docs/record-language.md` — structured record exchange language
- `docs/decisions/` — Architecture Decision Records
- `docs/project-log.md` — chronological project record
- `CHANGELOG.md` — release notes

## Governance

1. GitHub is the canonical source of truth.
2. Specifications and important design decisions must be committed here.
3. Important architecture decisions are recorded as ADRs.
4. Definitions and record formats are machine-readable and explicitly versioned.
5. LLM output is generated input, not an implicit runtime dependency.
6. Every deployable iteration must include release notes.
