# OpenForm Worked Record Examples

These files are illustrative `openform/record/v1` payloads that correspond to the first-party templates in `templates/`.

They serve three purposes:

1. Give humans a concrete example of the data shape produced by each Definition.
2. Give external LLMs a stable reference for how nested collections and media values appear in Records.
3. Provide regression fixtures for CI so template versions and example Records do not silently drift apart.

The examples are documentation fixtures only; they are not seeded into the production database.

Current note: `location` still uses the runtime's current string representation (for example `"22.6273,120.3014"`). A future dedicated location control may introduce a structured value contract through an explicit versioned change rather than silently changing existing Records.
