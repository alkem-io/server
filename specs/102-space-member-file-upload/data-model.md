# Phase 1 Data Model: Space Member File Upload for Callout Creation

## Database / persistence changes

**None.** No new tables, columns, enums, or migrations. PostgreSQL schema is
unchanged. The only persisted effect is the content of the authorization-policy JSON
that the authorization-reset engine already writes for the Space's shared storage —
it gains one additional credential rule when the relevant Space setting is enabled.

## GraphQL schema changes

**None.** No new or modified types, fields, inputs, or mutations. `schema.graphql`
and `schema-baseline.graphql` are unaffected.

## Conceptual entities involved (existing)

| Entity | Role in this feature | Change |
|--------|----------------------|--------|
| **Space** | Owns the "members may create callouts" setting and its own shared storage location. | None |
| **Space setting: members-may-create-callouts** | The single switch that gates both callout creation and (now) the matching file-upload capability. | None — read, not modified |
| **Space member (actor credential set)** | The actors who, when the setting is on, may create callouts and upload their files. | None — referenced, not modified |
| **Space shared storage location** | The Space-level storage that temporarily holds new callout content; the target of the file-upload capability. | None to its data; its computed authorization policy gains one credential rule |
| **Authorization policy (computed)** | The recomputed access rules for the shared storage. | Gains one **conditional, cascading** credential rule granting the file-upload capability to the eligible actor set |

## Authorization rule (the one added element)

- **Subject**: the actor credential set permitted to create callouts in the Space
  (members, plus inherited parent-space members where applicable).
- **Granted capability**: file-upload on the Space's shared storage location.
- **Condition**: present only when the Space's "members may create callouts" setting
  is enabled; absent otherwise.
- **Scope/propagation**: cascades from the Space's storage aggregator down to that
  Space's shared storage bucket only; does not extend to other spaces or to unrelated
  child entities.
- **Lifecycle**: created/removed solely by the authorization-reset computation for
  the owning Space; never written ad hoc.

## State transitions

There are no entity state machines. The only "transition" is the presence/absence of
the credential rule as a pure function of the Space setting at authorization-reset
time:

```
setting ON  → reset → policy includes member file-upload rule  → members can upload
setting OFF → reset → policy omits the rule                     → members cannot upload
```
