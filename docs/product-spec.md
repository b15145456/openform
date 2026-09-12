# OpenForm Product Specification

Status: Draft

## Purpose

OpenForm provides a common, specification-driven way to define data-entry forms and produce structured records that can be exchanged between software systems.

The platform is intentionally not tied to a single business domain. Domain specifications describe the vocabulary and constraints; OpenForm describes how those concepts become forms and records.

## Primary workflow

1. A specification exists in human-readable or machine-readable form.
2. A user explicitly authors a definition or asks an LLM/tool to generate one from the specification.
3. The generated OpenForm Definition is inspectable and versioned.
4. A client renders the form from the definition.
5. User input is validated against the definition.
6. Successful submission produces a structured OpenForm Record.
7. Other software consumes the record using the shared exchange contract.

## LLM boundary

LLM usage is optional and explicit. It belongs to the authoring/generation workflow.

Runtime form rendering, validation, persistence, and record exchange must not require an automatic LLM call. This gives OpenForm deterministic behavior and makes definitions independently testable.

## Product requirements

### Definitions

A definition should describe at minimum:

- schema/version
- definition identifier
- form metadata
- fields
- field types
- required/optional semantics
- validation constraints
- stable machine-readable keys

### Records

A submitted record should carry enough information to identify:

- record-language version
- record identity
- definition/schema identity and version
- record type
- creation time when applicable
- structured field values
- optional source/provenance metadata

### Interoperability

Definitions and records must be serializable using common data formats. JSON is the initial canonical representation unless superseded by a recorded architecture decision.

## Non-goals for the current phase

- automatic LLM execution for every form interaction
- embedding vendor-specific LLM behavior into the core record contract
- making UI layout details part of the semantic record format

## Source of truth

This repository is authoritative. Chat discussions and external whiteboards are working material until their decisions are committed here.
