Synchronous vs Async override evaluation

- `performOverrideEvaluation()`
  - Synchronous only. Reads reviews supplied via environment:
    - `SCHEMA_OVERRIDE_REVIEWS_JSON` (inline JSON array)
    - `SCHEMA_OVERRIDE_REVIEWS_FILE` (path to JSON file)
  - Will not perform network fetches. Use this in CLI code paths where async/await is not available.

- `performOverrideEvaluationAsync()`
  - Async. Will attempt to fetch reviews from the network (GitHub) when env-provided reviews are absent.
  - Use this when running in async-capable contexts (scripts using `await`, tests, or services).

Notes:

- Calling the sync function without providing env reviews will return an `OverrideEvaluation` with `applied: false` and a details entry prompting to use the async variant.
- Tests should prefer `performOverrideEvaluationAsync()` for determinism when mocking network responses.
