# Semantic Registry

Semantic types give fields machine-readable meaning without coupling OpenForm to a specific UI label or LLM. Field `id` remains the record key; `semantic_type` describes meaning; `unit` describes canonical measurement.

Registry source: `spec/semantic-registry.json`.

Initial namespaces: `fitness.*`, `commerce.*`, `location.*`, `media.*`, `inspection.*`, and extension namespace `custom.*`.

Canonical units currently include kg, g, lb, m, cm, km, s, min, h, ml, L, kcal, %, and TWD. Currency is included because commerce.price without currency is ambiguous.

Unknown semantic types should be rejected by strict tooling unless they begin with `custom.`. Runtime rendering must not depend on semantic_type; it is metadata for interoperability.
