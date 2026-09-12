# OpenForm Definition Contract

Status: Implemented (`openform/definition/v1`), enforced by `shared/runtime.js` (`validateDefinition`) and `spec/definition.schema.json`. This document must always match those two files — if you change the schema, update both.

An OpenForm Definition is a versioned, machine-readable artifact describing "what data should be collected." It says nothing about who collects it or how — that's the Runtime's job. This is the contract external LLMs (ChatGPT, Claude, Gemini, ...) generate, and the only thing the OpenForm Runtime reads to build a data-collection Mini-App. **OpenForm itself never calls an LLM** — a human explicitly generates a Definition elsewhere and pastes it in.

## Shape

```yaml
spec: openform/definition/v1
app:
  id: workout          # snake_case, stable, never renamed
  name: 健身紀錄         # display name, freely renamed any time
  version: 1            # positive integer, bump on breaking field changes
fields:
  - id: body_weight
    label: 體重
    type: number
    semantic_type: fitness.body.weight
    unit: kg
```

- `spec` — must be exactly the string `openform/definition/v1`.
- `app.id` — `^[a-z][a-z0-9_]*$`. This is the app's permanent identity. Every Record produced by this app references `app.id`, so it must never change once real data exists.
- `app.name` — human-facing display name. Free to edit at any time; editing it does not affect `app.id` or any existing Record.
- `app.version` — positive integer. Bump it when you change what a field *means* (not for cosmetic label edits).
- `fields` — ordered array of field objects (see below).

No other top-level keys are allowed (`additionalProperties: false` at the root and inside `app`).

## The core invariant: `id` vs `label`

Every field has:
- `id` — stable machine identity. `^[a-z][a-z0-9_]*$`, unique among its siblings. This is the JSON key a Record stores the value under. **Never changes** once you have real data, even if the field is renamed on screen.
- `label` — the text shown to the human filling out the form. Change this freely, any time, for any reason (translation, clarity, rebranding) — it never invalidates existing Records, because Records don't store labels at all.

```yaml
- id: body_weight
  label: 今日體重     # was 體重 yesterday — fine, id is unchanged
```

## Field object

```
id:            string, required, snake_case, unique among siblings
label:         string, required, non-empty
type:          one of the Field Types below, required
semantic_type: string, optional — see Semantic Registry
unit:          string, optional — see Canonical Units
min / max:     number, optional — for number/rating
options:       array of {value, label}, required for select/multi_select
fields:        array of field objects, required for collection
item_label:    string, optional — label for one item in a collection ("動作", "組")
```

Field objects allow additional vendor/UI-hint properties beyond this list (the schema does not close them), but the ones above are the only ones the Runtime currently acts on.

## Field types (v1)

`text`, `textarea`, `number`, `rating`, `select`, `multi_select`, `boolean`, `date`, `time`, `datetime`, `duration`, `image`, `video`, `audio`, `location`, `barcode`, `signature`, `collection`

Rules:
- `select` / `multi_select` require a non-empty `options` array of `{value, label}`; `value`s must be unique. **A Record stores `value`, never `label`** — e.g. `exercise: bench_press`, not `exercise: 臥推`. Values must be stable strings/numbers/booleans an LLM or app can match on; labels are free-text for humans and can be translated/reworded without touching data.
- `collection` requires a non-empty `fields` array — a nested list of the same field-object shape, recursively. This is how you model one-to-many structure, e.g. `Workout → exercises[] → sets[]`:

```yaml
- id: exercises
  label: 訓練動作
  type: collection
  item_label: 動作
  fields:
    - id: exercise
      label: 動作
      type: select
      options: [{value: squat, label: 深蹲}, {value: bench_press, label: 臥推}]
    - id: sets
      label: 組數
      type: collection
      item_label: 組
      fields:
        - id: weight
          label: 重量
          type: number
          semantic_type: fitness.exercise.load
          unit: kg
        - id: reps
          label: 次數
          type: number
          semantic_type: fitness.exercise.reps
        - id: rpe
          label: RPE
          type: rating
          min: 1
          max: 10
          semantic_type: fitness.exercise.rpe
```
- `image` / `video` / `audio` render a real file picker that uploads to object storage (Neon Object Storage in the reference deployment) and stores the resulting **public URL as a plain string** in the Record's `data` — same as any other single-value field, no special Record shape. The Runtime never stores raw bytes in Postgres. `location` / `barcode` / `signature` don't have dedicated capture UI yet and currently fall back to a plain text input (see `docs/TODO.md`); a Definition author doesn't need to wait for that UI to declare these types, since the field still validates today.

**Never** put executable code (JavaScript, shell, SQL, arbitrary expressions) in a Definition. There is no field type or property that the Runtime evaluates as code — it is a pure data description, by design.

## Semantic Registry

`type` describes *shape* (a number, a piece of text, a date). `semantic_type` optionally describes *meaning*, so two different apps (or an LLM reading a Record later) can recognize "these are both a person's body weight" even if the `id`/`label` differ.

Registered values (`spec/semantic-registry.json`):
```
fitness.body.weight, fitness.exercise.name, fitness.exercise.load, fitness.exercise.reps,
fitness.exercise.rpe, fitness.exercise.duration, fitness.exercise.form_video,
commerce.price, commerce.quantity, location.position,
media.image, media.video, media.audio,
inspection.status, inspection.issue.description
```
Anything not on that list must use the `custom.` prefix (e.g. `custom.vendor_code`) — validation rejects an unregistered `semantic_type` that isn't `custom.*`. Extend the registry (and this list) before introducing a new non-custom semantic type broadly.

## Canonical Units

`unit`, when present, must be one of: `kg, g, lb, m, cm, km, s, min, h, ml, L, kcal, %, TWD`. Never `公斤`, `KG`, `kgs`, or other localized/non-canonical spellings — the UI can localize the *label*, but `unit` itself must stay canonical so numbers stay comparable across apps.

## Validation

`validateDefinition()` in `shared/runtime.js` is the single source of truth and runs identically in the frontend (before import) and backend (`POST /api/apps`, defense in depth). `spec/definition.schema.json` (JSON Schema Draft 2020-12) is the equivalent machine-readable schema for external tooling. Both must agree; `tests/runtime.test.js` includes a check that the schema documents parse and carry the right `spec` constants.

## Generating a Definition with an external LLM

This format is intentionally generic — it is not tied to mattresses, workouts, or any one domain. Give an LLM a prompt like this (paste the rules above, or just this repo's `docs/openform-definition.md`, as context) to get a Definition for *any* data-collection use case:

> Generate an `openform/definition/v1` YAML Definition for: **{describe what you want to collect, e.g. "tracking books I've read: title, author, rating, date finished, notes"}**.
> Rules: output only the YAML, no prose. `app.id` is snake_case and stable. Every field has a snake_case `id` and a human `label`. Use `select`/`multi_select` with stable `value`s (never store a label as data). Use `collection` for repeating structure. Only use these field types: text, textarea, number, rating, select, multi_select, boolean, date, time, datetime, duration, image, video, audio, location, barcode, signature, collection. Do not include any JavaScript, shell, SQL, or executable expressions — this is a pure data description.

The result pastes directly into OpenForm's "匯入 Spec" screen, which validates it (`validateDefinition`) and shows a preview (app name, version, field count) before creating the app — nothing is trusted purely because an LLM produced it.

## First-party templates

`templates/mattress.yaml`, `templates/workout.yaml`, `templates/inspection.yaml` are worked examples of this contract, seeded automatically into every OpenForm backend on boot (`backend/src/migrate.js`) so they show up as ready-to-use Apps. They are starting points, not special-cased behavior in the Runtime — anything they can do, an LLM-generated Definition for an unrelated domain can do too.
