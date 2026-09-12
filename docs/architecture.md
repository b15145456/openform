# OpenForm Architecture

Status: Draft

## Architectural boundary

OpenForm has two intentionally separate planes.

### Authoring plane

Responsible for creating and evolving definitions.

```text
Domain Specification
       |
       +--> Human author
       |
       +--> Explicit LLM/tool generation
                    |
                    v
             OpenForm Definition
```

LLMs are allowed here, but their output becomes a normal versioned artifact before runtime use.

### Runtime plane

Responsible for deterministic execution of an accepted definition.

```text
OpenForm Definition
       |
       v
Definition Loader
       |
       +--> Renderer
       +--> Validator
       +--> Submission Processor
                    |
                    v
              OpenForm Record
                    |
                    v
           Storage / Integration
```

## Core components

- **Definition model** — portable semantic description of a form.
- **Definition loader** — loads and checks definition compatibility.
- **Renderer adapter** — converts semantic definitions into UI components.
- **Validation engine** — validates submitted values without requiring an LLM.
- **Record encoder** — produces the standard exchange record.
- **Integration adapters** — map OpenForm records to external systems when required.

## Design rules

1. Semantic field identity must not depend on display labels.
2. UI presentation and record semantics are separate concerns.
3. Definitions and records carry explicit format versions.
4. Runtime validation must be reproducible.
5. Generated definitions are never trusted solely because an LLM generated them.
6. Vendor-specific extensions must not silently redefine core semantics.

## Evolution

Breaking changes require a new format version and migration/compatibility rules. Major architecture choices should be captured under `docs/decisions/`.
