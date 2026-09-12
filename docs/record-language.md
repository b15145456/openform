# OpenForm Record Language

Status: Draft / v0 design

OpenForm Record Language is the interoperability contract used to exchange records produced from OpenForm definitions.

The goal is not merely to save form answers. The record must retain stable semantic identity so another application can understand what kind of record and fields it received.

## Initial envelope

```json
{
  "openformRecord": "0.1",
  "id": "01J...",
  "type": "workout.session",
  "definition": {
    "id": "example.workout-session",
    "version": "1.0.0"
  },
  "createdAt": "2026-09-12T10:00:00+08:00",
  "data": {
    "exercise": "squat",
    "sets": 4
  }
}
```

## Envelope semantics

- `openformRecord` — exchange-language version.
- `id` — unique record identity.
- `type` — stable semantic record type.
- `definition` — definition identity/version used to create or validate the record.
- `createdAt` — creation timestamp when the producer has one.
- `data` — semantic field values keyed by stable definition keys.

## Design goals

1. **Portable** — records can move between independent applications.
2. **Versioned** — producers and consumers can negotiate compatibility.
3. **Deterministic** — understanding a record does not require another LLM call.
4. **Extensible** — domain-specific metadata can evolve without redefining core fields.
5. **Traceable** — consumers can identify the definition that produced the record.

## Definition vs Record

A Definition answers: **What fields and rules describe this kind of input?**

A Record answers: **What concrete data was captured using that semantic contract?**

Keeping them separate lets multiple records reuse one definition and allows definitions to evolve independently.

## Open questions

The following require explicit decisions before a stable 1.0 specification:

- canonical identifier/namespace rules
- schema registry/discovery
- extension namespace rules
- compatibility guarantees
- provenance/signature model
- partial/update records
- references between records
- canonical JSON and signing requirements
