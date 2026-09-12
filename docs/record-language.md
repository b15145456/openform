# OpenForm Record Language

Status: Implemented (`openform/record/v1`), produced by `makeRecord()` in `shared/runtime.js`, enforced by `spec/record.schema.json`. This document must always match those two files.

An OpenForm Record is the interoperability contract for data actually collected using a Definition. A Definition answers "what fields and rules describe this kind of input?"; a Record answers "what concrete data was captured?" Keeping them separate lets many Records reuse one Definition, and lets a Definition evolve without invalidating old data.

## Envelope

```json
{
  "spec": "openform/record/v1",
  "id": "rec_2ac66acc-6129-43fe-9fe8-24422c5494a3",
  "definition": { "id": "workout", "version": 1 },
  "created_at": "2026-09-12T10:00:00.000Z",
  "updated_at": "2026-09-12T10:00:00.000Z",
  "data": {
    "body_weight": 72.5,
    "exercises": [
      { "exercise": "bench_press", "sets": [{ "weight": 100, "reps": 8, "rpe": 8 }] }
    ]
  }
}
```

- `spec` — must be exactly `openform/record/v1`.
- `id` — `rec_<opaque unique string>` (a UUID by default, via `crypto.randomUUID()`). Unique per record.
- `definition.id` / `definition.version` — exactly the `app.id` / `app.version` of the Definition that produced this record. This is how a consumer (another app, or an LLM reading exported data later) knows which Definition to check the field `id`s against — never guess it from context.
- `created_at` / `updated_at` — ISO 8601 UTC timestamps.
- `data` — an object keyed by field `id` (never by `label`), one key per top-level field in the Definition. A `collection` field's value is an array of objects, each keyed by that collection's nested field `id`s — recursively, so nesting in the Definition (`exercises[].sets[]`) is mirrored exactly in `data`.

No other top-level keys are allowed (`additionalProperties: false`).

## Design goals

1. **Portable** — a Record is a plain JSON document; any application (or LLM) can read it without calling back into OpenForm.
2. **Versioned** — `definition.id`/`definition.version` let a consumer detect when a Record was produced under an older field layout.
3. **Deterministic** — understanding a Record never requires an LLM call; it's a lookup against the Definition's field `id`s.
4. **Stable identity, not stable shape** — `data` keys are field `id`s, which don't change when a label is edited, so old exported Records stay meaningful even after the app's UI copy changes.

## Definition evolution and old Records

If you add fields, remove fields, or reinterpret a field's meaning, bump `app.version` on the Definition. A Record always carries the `definition.version` it was created under, so:
- Old Records remain valid and readable — nothing retroactively rewrites `data`.
- A consumer that only understands v1 field `id`s can still read a v1 Record correctly, even if the app has since moved to v2.
- Don't delete a field's `id` and reuse it for something semantically different — retire it and add a new `id` instead, since old Records may still reference the old meaning.

## Producing and consuming Records

- `makeRecord(definition, data)` (`shared/runtime.js`) is the only place that constructs the envelope — frontend and backend both import it, so the shape can't drift between them.
- The backend (`backend/src/routes/records.js`) is the only writer of Records in a deployed OpenForm instance; it stores them in Postgres (`records` table: `id`, `app_id`, `definition_version`, `data`, `created_at`, `updated_at`) and reconstructs the full envelope on read.
- JSON export (from the app screen) is exactly this envelope, one array element per record — safe to hand to another program or paste into an LLM prompt for analysis, since it's self-describing (carries its own `definition` reference).
