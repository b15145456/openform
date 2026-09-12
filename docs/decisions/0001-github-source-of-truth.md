# ADR-0001: GitHub is the OpenForm source of truth

- Status: Accepted
- Date: 2026-09-12

## Context

OpenForm design work can originate in conversations, LLM sessions, whiteboards, or other tools. Without a canonical location, those sources can diverge and make it unclear which specification is authoritative.

## Decision

The `b15145456/openform` GitHub repository is the authoritative project record.

Product specifications, protocol/format definitions, architecture decisions, and release notes become authoritative when committed to this repository.

External notes may link to or summarize GitHub content, but they do not override committed specifications.

## Consequences

- important decisions need to be committed
- specification changes have Git history
- releases can point to an exact project state
- discussions not reflected in the repository remain proposals/working notes
