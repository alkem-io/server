## Summary

<!-- Briefly describe the change and its purpose. Link related issues/specs if applicable. -->

## Schema Contract Checklist (Feature 002)

If this PR affects the GraphQL schema, complete ALL items below:

- [ ] Ran `npm run schema:print` (and optionally `npm run schema:sort`) to regenerate `schema.graphql`.
- [ ] Retrieved base snapshot (e.g. `git show origin/develop:schema.graphql > tmp/prev.schema.graphql`).
- [ ] Ran `npm run schema:diff` to produce `change-report.json` and `deprecations.json`.
- [ ] Reviewed classifications; only expected changes present.
- [ ] (Optional) Ran `npm run schema:validate` and artifacts passed validation.
- [ ] Committed ONLY `schema.graphql` (not the JSON artifacts).

### Change Report Summary

Paste the key counts from `change-report.json` (example format below) — remove any zero lines if desired:

```
Additive: X
Deprecated: Y
Deprecation Grace: Z
Breaking: B (override applied? yes/no)
Premature Removals: P
Invalid Deprecations: I
Info: N
```

### Deprecations Added / Updated

List new or updated deprecations with schedules (`REMOVE_AFTER=YYYY-MM-DD | reason`). Indicate any in grace period.

### Breaking Changes (If Any)

If BREAKING changes are intentional:

- Rationale:
- Risk assessment / mitigation:
- CODEOWNER approval with phrase `BREAKING-APPROVED` requested? (link)

### Other Notes

<!-- Testing strategy, migration notes, docs follow-up, etc. -->

---

Reference docs: `specs/002-schema-contract-diffing/quickstart.md` for full workflow and troubleshooting.
