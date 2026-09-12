# OpenForm Definition Contract

Status: Draft / v0 design

An OpenForm Definition is a versioned, machine-readable artifact describing the semantic structure and validation rules of a form.

## Initial shape

```json
{
  "openform": "0.1",
  "id": "example.workout-session",
  "version": "1.0.0",
  "title": "Workout Session",
  "recordType": "workout.session",
  "fields": [
    {
      "key": "exercise",
      "type": "string",
      "label": "Exercise",
      "required": true
    },
    {
      "key": "sets",
      "type": "integer",
      "label": "Sets",
      "required": true,
      "constraints": { "min": 1 }
    }
  ]
}
```

## Required concepts

### `openform`

Version of the OpenForm Definition format.

### `id`

Stable definition identifier. It should identify semantics rather than a particular UI implementation.

### `version`

Version of this definition.

### `recordType`

Semantic type emitted by successful submissions.

### `fields`

Ordered field definitions. Each field has a stable `key` independent from its user-facing label.

## Field model

Initial core types are expected to include:

- string
- integer
- number
- boolean
- date
- datetime
- enum
- object
- array

Exact type semantics and extension rules remain subject to versioned specification work.

## Validation

Constraints belong in the definition when they can be evaluated deterministically. Examples include required values, numeric ranges, string length, enumerated values, and structural constraints.

## Presentation

Presentation hints may be added, but consumers must not infer semantic meaning solely from widgets or layout. A `select`, `radio`, or other widget can render the same semantic enum field.
