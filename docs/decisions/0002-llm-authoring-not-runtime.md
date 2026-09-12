# ADR-0002: LLM generation belongs to authoring, not core runtime

- Status: Accepted
- Date: 2026-09-12

## Context

OpenForm should allow a user to provide a specification and use an LLM to generate a useful form definition. However, making every runtime operation depend on an LLM would make behavior less deterministic, harder to test, more expensive, and vendor-dependent.

## Decision

LLM invocation is explicit and belongs to the authoring/generation workflow.

Once generated, an OpenForm Definition is a normal versioned artifact. Rendering, deterministic validation, record creation, and exchange do not automatically invoke an LLM.

## Consequences

- generated definitions can be reviewed before use
- runtime works without an LLM dependency
- definitions can be cached, versioned, tested, and reused
- different authoring tools can generate the same standard format
- future optional AI runtime features must be explicit extensions rather than hidden core behavior
