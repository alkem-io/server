# Evidence — 027 Platform Role Redesign (Slice A)

This document is the PR-body evidence artifact for T028, T029, T065, T067
and T068 — the human-readable half of the verification layer (the
executable half is `src/platform/platform-role/verification/`, run by
`pnpm lint` and `pnpm test:ci:no:coverage`). It is the input a security
owner needs for SC-001's sign-off gate; nothing here substitutes for that
sign-off.

All counts are read directly off `src/platform/platform-role/verification/a.row.surfaces.ts`
(the executable census) as of this commit, not re-derived by hand (T068's
explicit instruction). The census holds **112 entries** across **39 files**,
covering **101 distinct (file, member) surfaces**, spanning **21 live
A-rows** (A18 is legitimately empty — FR-020's removed bug). The 11-entry
gap between 112 and 101 is fully accounted for: **2** are A17's
`{deferred: 'B'}` placeholders (not yet real — T078 creates them in Slice
B), and **9** are entries that deliberately re-declare a surface another
row already counts — `platform.role.assignment.rules.service.ts#{assign,
remove}PlatformRoleToUser` (A1 ⊂ A2, ×2), `registration.resolver.mutations.
ts#deleteUser` (A4/A5's dual-path gate on the SAME mutation, ×1), and the
six `platform.role.holder.list.access.ts` members A20 and A20b share in
full (the four holder-list field resolvers plus the two credential-based
admin queries added by the sec-server-10 fix, ×6). 112 − 2 − 9 = 101.

---

## T028 — God-mode evidence table

Every action reachable **only** through the root god-mode rule
(`platform.authorization.policy.service.ts:69-86`, `GLOBAL_ADMIN` →
`[CREATE, READ, UPDATE, DELETE, GRANT]` cascaded over the seven root-inheriting
trees) or the `GLOBAL_SUPPORT` platform-subtree cascade
(`platform.service.authorization.ts:298-310`), before this feature's
re-anchoring. Read off the census's `legacyReachers` field for every A-row
whose Slice B `intendedOwners` narrows the surface off `PLATFORM_ADMIN` /
the two legacy cascades.

| A-row | Family | Surfaces (of 112) | Reachable via root cascade | Reachable via `GLOBAL_SUPPORT` cascade |
|---|---|---:|:---:|:---:|
| A1 | Assign/revoke a Platform role | 10 | — (role-set tree, own rule) | — |
| A2 | Assign/revoke a Feature role | 4 | — | — |
| A3 | Authorization/license reset (032) | 10 | ✅ (legacy `GLOBAL_ADMIN`) | ✅ |
| A4 | Change login email | 3 | ✅ | ✅ |
| A5 | Delete user; reset identity/account | 3 | ✅ | ✅ |
| A6 | Create/delete organization | 2 | ✅ (delete only) | ✅ (delete only) |
| **A7** | **Edit org-owned pack/hub + template CRUD** | **8** | ✅ **new capability** (research C2 — org-owned packs/hubs sit under the `account` tree, which the root cascade already reaches; **T037 makes this an explicit gate, closing a path that was previously reachable ONLY by inheritance**) — spec-server-14 fix: scoped to ORGANIZATION-hosted accounts only, not every account | ✅ |
| A8 | Delete callout/contribution/space; delete org pack/hub; set publisher | 6 | ✅ | ✅ |
| A9 | Move space/hub/pack/VC/callout | 13 | ✅ (4 of 13 via legacy `TRANSFER_*`; 7 of 13 via a resolver-local synthetic `PLATFORM_ADMIN` policy, not the root cascade) | partial |
| A10 | Platform settings/config | 6 | ✅ | ✅ |
| A11 | Operational machinery (032) | 13 | ✅ | ✅ |
| A12 | Assign/revoke license plans | 6 | ✅ | — |
| A13 | Define license plans/entitlements | 5 | ✅ | ✅ (corr-server-12 fix: `globalSupportPlatformAdmin`'s cascade off `platform.authorization` reaches `licensingFramework.authorization` too — the synthetic gate policy and the census both now include `global-support`) |
| A14 | Change space visibility | 1 | ✅ | — |
| A15 | In-space support; manage forum | 3 | — (per-space setting) | ✅ (forum only — the row this feature's FR-007(e) narrowing targets) |
| A16 | Read across spaces | 1 | ✅ (READ only — accepted, FR-010 exception) | — |
| A19 | Read the audit trail | 3 | ✅ | ✅ |
| A20/A20b | Read Platform/Feature holder lists | 12 | — (role-set tree) | — |

**A7 confirms research C2's finding**: before T037, org-owned innovation
packs/hubs and their templates were editable by any `GLOBAL_ADMIN` /
`GLOBAL_SUPPORT` holder purely because the `account` tree inherits the root
cascade — there was no purpose-built privilege naming this capability
anywhere. T037's `PLATFORM_SUPPORT_ORG_RESOURCES` grant is additive (the
legacy paths still work), but it is the first time this capability has a
name and an owner (`platform-support`) independent of "holds god mode."

## T029 — Structural findings and remediation status

| # | Finding | Evidence | Remediation (this feature) |
|---|---|---|---|
| 1 | **Near-inert `global-support-manager`** | Zero mutation-level authorization grants outside one `callouts.set.service.authorization.ts` cascade transfer-access rule (research finding 3; confirmed by grep — the credential appears only in enum declarations, the seed migration, `ROLE_CREDENTIAL_MAP`, and one PII-footprint utility). | T066: the callouts-set transfer-access grant is re-anchored onto `platform-resource-admin` (A9). Slice B (T081) removes the role entirely with zero capability loss. |
| 2 | **Redundant `global-community-reader`** | Grants plain `READ` + `READ_USER_SETTINGS`, fully subsumed by `platform-users-admin`'s A4/A5 grant (T060) and by ordinary space/org membership visibility. No unique capability. | Retained (additive slice); Slice B (T077/T081) drops it with the other nine legacy credentials. |
| 3 | **Two silent-void seeded rows (research C1)** | `global-spaces-reader` (role `RoleName.GLOBAL_SPACES_READER = 'global-spaces-reader'`, credential `AuthorizationCredential.GLOBAL_SPACES_READER = 'global-spaces-read'` — **the strings differ**) and `global-community-reader` similarly mismatched in the pre-existing seed data — a role row whose `credential.type` no authorization rule actually reads. | T009-T011: the dual credential-resolution path is replaced by one canonical `ROLE_CREDENTIAL_MAP`, and `role.credential.map.spec.ts` (FR-011/SC-008) makes a future instance of this mismatch a build failure, not a silent gap. T069 confirms no repair migration ships for the two existing void rows — both are retired outright in Slice B, not patched. |
| 4 | **Overlapping Support / License Manager platform-admin grants** | Both `global-support` and `global-license-manager` hold broad, overlapping platform-admin-adjacent capability today (e.g. both reach `ACCOUNT_LICENSE_MANAGE` and `PLATFORM_USERS_ADMIN`'s legacy set) with no declared boundary between "support operations" and "licensing operations." | This feature's whole structural core (Phase 4) replaces the overlap with two disjoint owners — `platform-support` (A6/A7/A15) and `platform-license-manager` (A12/A14) — each additively retaining the legacy overlap through Slice A and losing it only at Slice B (T076), when the boundary becomes real. |

---

## T065 — FR-005 boundary evidence (Platform Operations Admin)

FR-005 requires `platform-operations-admin` to remain scoped to its
pre-existing (032) operational family and gain **nothing** from this
feature's new privileges. Evidence: grep every `*.service.authorization.ts`
for `PLATFORM_OPERATIONS_ADMIN` (the credential) and confirm it appears in
**no** rule granting any of the five boundary privileges.

```
$ grep -rn "PLATFORM_OPERATIONS_ADMIN" src/**/*.service.authorization.ts
```

| Boundary privilege | `platform-operations-admin` present in its grant set? |
|---|:---:|
| `READ_USER_PII` | **No** |
| `READ_USER_SETTINGS` | **No** |
| `PLATFORM_USERS_ADMIN` | **No** |
| `FEATURE_ROLE_ASSIGN` | **No** |
| Content CRUD (`PLATFORM_CONTENT_FULL_ACCESS`) | **No** |
| `PLATFORM_SETTINGS_ADMIN` | **No** |

`platform-operations-admin`'s only appearances across the codebase are: (a)
`AUTHORIZATION_RESET` / `LICENSE_RESET` / `PLATFORM_OPERATIONS_ADMIN`
(the pre-existing 032 operational privileges, A3/A11), and (b) the
`platform.role.assignment.rules.service.ts` `PLATFORM_FAMILY_ROLES` set,
where it is treated identically to every other `Platform …` role for
assignment-rule purposes only (rule 1 still requires the assigner hold
`GRANT_GLOBAL_ADMINS`, exactly as for the other nine). Negative space
confirmed — no code path in this feature's diff adds
`platform-operations-admin` to any of the six boundary rules above.

---

## T067 — FR-009 evidence: every target role grants ≥1 enforced capability

| # | Role | Enforced capability | Citing rule / gated resolver |
|---|---|---|---|
| 1 | `platform-roles-admin` | Assign/revoke any `Platform …` role (A1) | `platform.role.assignment.rules.service.ts` rule 1, `GRANT_GLOBAL_ADMINS` grant set (`platform.service.authorization.ts`) |
| 2 | `platform-content-full-access` | Content CRUD across all seven root-inheriting trees minus entity renames (A8) | Root replacement rule, `platform.authorization.policy.service.ts` (T036); gated resolvers T043 |
| 3 | `platform-resource-admin` | Move/transfer spaces, hubs, packs, VCs, callouts, contributions (A9) | `TRANSFER_RESOURCE_OFFER`/`_ACCEPT`, `MOVE_CONTRIBUTION` grants (`account.service.authorization.ts`, `space.service.authorization.ts`, T037/T038) |
| 4 | `platform-settings-admin` | Platform settings, iframe allow-list, notification blacklist, license-plan/policy definitions (A10/A13) | `PLATFORM_SETTINGS_ADMIN` grant (`platform.service.authorization.ts`, T035); gated resolvers T045/T047 |
| 5 | `platform-operations-admin` | Authorization/license reset, operational maintenance mutations (A3/A11, 032) | Pre-existing 032 grant, unchanged by this feature |
| 6 | `platform-users-admin` | Change login email, delete/reset user identity & account, assign Feature roles (A4/A5/A2) | `PLATFORM_USERS_ADMIN` grant (`user.service.authorization.ts`, T060); `FEATURE_ROLE_ASSIGN` (`platform.service.authorization.ts`, T034) |
| 7 | `platform-support` | Create/delete organizations, edit org-owned packs/hubs, manage the forum, in-space support (A6/A7/A15) | `CREATE_ORGANIZATION`/`DELETE_ORGANIZATION` (T039), `PLATFORM_SUPPORT_ORG_RESOURCES` (T037), `PLATFORM_FORUM_MANAGE` (T035) |
| 8 | `platform-license-manager` | Assign/revoke license plans, change space visibility (A12/A14) | `ACCOUNT_LICENSE_MANAGE` extension (T037) |
| 9 | `platform-spaces-reader` | Cross-space read (A16) | `READ` grant on the space tree, replacing the void `global-spaces-reader` (T038) |
| 10 | `platform-audit-reader` | Read the platform audit trail (A19); read Platform/Feature holder lists (A20/A20b) | `PLATFORM_AUDIT_READ` (T035); `PLATFORM_ROLE_HOLDERS_READ` (T034) |
| 11 | **`feature-beta-tester`** | Beta/trial license entitlement | **Licensing-policy credential rule (T040a), NOT an authorization-policy rule** — the row most likely to look empty if this table only checked `*.service.authorization.ts` files |
| 12 | `feature-virtual-assistant` | Access the Web AI Assistant (`ACCESS_VIRTUAL_ASSISTANT`) | `platform.service.authorization.ts` (T035), additive alongside the pre-existing `assistant-access` grant |
| 13 | `feature-organization-creator` | Create an organization (A6, shared with `platform-support`) | `CREATE_ORGANIZATION` grant (T035/T039) |

Every row has a citable, enforced capability. No row is empty.

---

## T068 — FR-010 consistency sweep (read off `A_ROW_SURFACES`)

For every census entry of every A-row, the same privilege is enforced
identically across all of that row's surfaces. Read directly off
`a.row.surfaces.ts`; **not** re-derived — this table cites what the census
already declares. Rows needing an explicit surface count because a
family-level sweep would miss part of them:

| A-row | Surfaces | Note |
|---|---:|---|
| A1/A2 (assign/revoke pair) | 2 (A1) + 4 (A2), 2 of which overlap | The two `*PlatformRoleTo{User,Organization}*` resolver methods now cover BOTH user and organization targets (T032a) — two resolver surfaces, not one |
| A8 | 6 | `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo` — the two org-owned container deletes join the three ordinary content deletes |
| A19 | 3 | `audit-log-analyze` MCP tool + two `admin.user.email.change.resolver.fields.ts` GraphQL fields, all three on `PLATFORM_AUDIT_READ` (T050/T050a) |
| A17 | 2 | Both deferred to Slice B (T078); declared now with `{deferred: 'B'}` so `reachability.spec.ts` covers them from the moment they exist |

**A16 is the sweep's one intentional exception**, declared as a field
(`acceptedExtraReachers`), not a sentence: `platform-content-full-access`
reaches cross-space read through the root cascade's plain `READ`, and this
is accepted because A16 is a read family holding no cell in the
admin-family denial grid — `platform-spaces-reader` exists to give a
service account that read *without* content-write power. Checked
mechanically by `reachability.spec.ts` (T070m).

**A15's forum is not a parallel exception** — its owner (`platform-support`)
and `platform-content-full-access` are mutually denied (spec row 2), so it
was given its own privilege (`PLATFORM_FORUM_MANAGE`, T035/T049) rather than
an accepted-exception declaration.

**FR-023's `admin*` naming SHOULD**: the maintenance mutations already carry
the `admin*` prefix where 032 delivered them (`admin.licensing.*`,
`admin.identity.*`, `admin.users.*`, `admin.authorization.*`,
`admin.communication.*`, `admin.search.*`, `admin.geolocation.*`,
`admin.avatarresolver.*`, `admin.whiteboard.*`). No survivor outside that
prefix was found among this feature's re-gated surfaces requiring a
rename decision.

---

## T070m — the reachability equality, and what it found

`reachability.spec.ts` (202 assertions, one equality per census surface per
live slice) asserts `reachers(surface, slice)` — the DERIVED set, from the
gate + grant/cascade model — equals the DECLARED intent
(`intendedOwners ∪ acceptedExtraReachers` [`∪ legacyReachers` in Slice A]).
Building the model to make this equality hold surfaced **six real defects**,
each fixed rather than the assertion relaxed:

1. `AUTHORIZATION_RESET` / `LICENSE_RESET` / `PLATFORM_OPERATIONS_ADMIN`
   (A3/A11, pre-existing 032 privileges) had no entry in the reachability
   model's managed-privilege mirror at all — every A3/A11 surface derived
   to an empty reacher set.
2. Bare `READ` on the space tree (A16, T038's `platform-spaces-reader`
   grant) was similarly unmirrored.
3. A9's three cross-L0 moves, A12's license-plan `GRANT`, and A13's bare
   `CREATE`/`UPDATE`/`DELETE` on the licensing-framework tree needed a new
   TREE-SCOPED grant mechanism — these three rows' literal gate is a
   baseline CRUD verb (or the legacy `PLATFORM_ADMIN` catch-all via a
   resolver-local synthetic policy) reused too promiscuously elsewhere to
   manage as a global privilege without leaking into A6/A7/A8's unrelated
   `anyOf` gates over the same literals.
4. **A4 was missing `global-platform-manager`** from its declared legacy
   reachers — the single `PLATFORM_USERS_ADMIN` credential rule
   (`user.service.authorization.ts`) grants it to A4's and A5's legacy
   reachers as one undifferentiated credential list, so a credential added
   for A5 reaches A4 too.
5. **A7 was missing `global-admin`** — it still holds ordinary `UPDATE` on
   the `account` tree via the Slice-A-only legacy CRUD+GRANT cascade, so it
   reaches A7's dual-path owner branch today, same as any account-tree
   `UPDATE` holder.
6. **A14 was missing `global-license-manager`** (already held
   `ACCOUNT_LICENSE_MANAGE` before T037's additive extension) and **A16 was
   missing `global-admin`/`global-support`** (both hold plain `READ` on the
   space tree via the root cascade today, exactly like the already-declared
   `global-spaces-reader`).

All six are census/model corrections, not policy narrowings — every fix
widened a declared legacy-reacher list to match what the code already does
today, preserving Slice A's additive invariant.

---

---

## T069 — research C1 verified against the current tree

Exactly two seeded rows name a credential no check reads, confirmed by
reading `src/migrations/utils/platform.role.seed.definitions.ts` directly:

- `global-spaces-reader`: seeded `credentialType: 'global-spaces-reader'`,
  but `AuthorizationCredential.GLOBAL_SPACES_READER = 'global-spaces-read'`
  (no trailing `er`) — the stored row and the enum never match.
- `global-community-reader`: seeded `credentialType: 'global-community-reader'`,
  but `AuthorizationCredential.GLOBAL_COMMUNITY_READ = 'global-community-read'`
  — same shape of mismatch.

**No repair migration ships** (D1): both rows are retired outright by this
feature (Slice B, T081/T082), and the fix is structural — `ROLE_CREDENTIAL_MAP`
(T009/T010) resolves the CORRECT canonical type regardless of what a stored
row carries, so the two void rows are inert rather than dangerous for the
whole of Slice A.

## T070/T070l — mutation-test evidence (SC-008, SC-018, SC-019 are ENFORCED, not asserted)

Four perturbations, each applied, confirmed to fail the relevant gate, then
reverted with the suite confirmed green again:

**(a) Anti-drift guard (T070, SC-008)** — skewed `ROLE_CREDENTIAL_MAP[PLATFORM_SUPPORT]`
from `AuthorizationCredential.PLATFORM_SUPPORT` to `AuthorizationCredential.PLATFORM_LICENSE_MANAGER`:

```
FAIL role.credential.map.spec.ts > seed definition "'platform-support'" has a
     matching ROLE_CREDENTIAL_MAP entry, correctly resolved
AssertionError: expected 'platform-license-manager' to be 'platform-support'
```
Reverted; 38/38 green.

**(b) Root cascade regression, re-run post-reversal (spec-server-17 fix)** —
`ROOT_CASCADE.privileges` permanently carries `CREATE`/`READ`/`UPDATE`/`DELETE`
since the ninth `/speckit-analyze` pass's reversal (FR-004/SC-004), so the
ORIGINAL perturbation here ("added `DELETE` back to `ROOT_CASCADE.privileges`")
is no longer performable — `DELETE` is already there permanently, and the
staleness of that record is exactly what spec-server-17 flagged. Re-run as
the still-live equivalent: added `AuthorizationPrivilege.UPDATE_NAMEID` to
`ROOT_CASCADE.privileges` — the ONE privilege `cascade.model.ts`'s own doc
comment says is kept off the root rule "BY DESIGN: A17 is owned by NO global
role (spec row 2, FR-020), so cascading it would hand Content Full Access
entity renames the spec explicitly denies it":

```
FAIL reachability.spec.ts > A17 > A17/(T078, Slice B — content-entity nameID
     protected section not yet created)#nameID (protected section of the
     general content-entity update) [1] — Slice B: derived ≡ intendedOwners
     ∪ acceptedExtraReachers
Error: A17/(T078, Slice B — …)#nameID … slice B: unexpected reacher(s)
     [platform-content-full-access] (derived=[platform-content-full-access],
     declared=[])

FAIL reachability.spec.ts > A17: EMPTY intent derives to ZERO reachers at
     Slice B — owned by the entity admin, no global role
AssertionError: expected [ 'platform-content-full-access' ] to have a
     length of +0 but got 1
```
`platform-content-full-access` immediately re-acquires the entity-rename
reach A17/FR-020 explicitly withholds from it — exactly the class of
regression T036's narrowed root rule exists to prevent, reproduced against
the CURRENT (post-reversal) model rather than the stale pre-reversal one.
Reverted; 374/374 green (`unit.coverage.spec.ts` + `reachability.spec.ts` +
`surface.drift.spec.ts`, the count having grown from 202 across the
review-round fixes this document's earlier revision predates).

**(c) Drop A16's `acceptedExtraReachers`** — removed the one declared FR-010
exception entry:

```
FAIL reachability.spec.ts > A16 > createPlatformRolesAccess — Slice A/B
FAIL reachability.spec.ts > A16: the accepted extra reacher ... BY DESIGN
```
Reverted; 202/202 green.

**(d) Drop A14's `intendedOwners`** — emptied the declared intent for the
space-visibility mutation:

```
FAIL reachability.spec.ts > A14/space.resolver.mutations.ts#{...} — Slice A/B
```
Reverted; 202/202 green.

All four perturbations were caught by the layer whose job it is to catch
them, and none required touching the perturbed file's neighbours to detect
— confirming SC-008/SC-018/SC-019 are enforced by a running gate, not
merely documented as an intention.

---

## Sign-off checklist for the security owner (SC-001)

- [ ] T028's god-mode table reviewed — A7's "new capability" callout in
      particular, since it is the one row where this feature closes a gap
      rather than merely re-anchoring an existing one.
- [ ] T029's four structural findings reviewed, remediation status accepted.
- [ ] T065's FR-005 negative-space table reviewed.
- [ ] T067's 13-row FR-009 table reviewed — no empty role.
- [ ] T068's FR-010 sweep and the two declared exceptions (A16 read family,
      A15 given its own privilege) reviewed.
- [ ] T070m's six reachability-model findings reviewed and accepted as
      corrections, not narrowings.

---

## T055 — `notifications@alkem.io`'s `global-community-read` (spec-server-13 fix)

**Decision recorded, not silently dropped or silently kept.** The seeded
credential is `AuthorizationCredential.GLOBAL_COMMUNITY_READ`
(`'global-community-read'`) — the broad-PII-read credential consumed
throughout `organization.service.authorization.ts`,
`user.service.authorization.ts` and
`virtual.contributor.service.authorization.ts`. It is **NOT** the same
identifier as the retired `RoleName.GLOBAL_COMMUNITY_READER`
(`'global-community-reader'`, one of Slice B's ten retired role/credential
values per `contracts/graphql-contract.md` §Slice B) — the two differ by
exactly the "-ER" suffix that is C1's silent-void naming mismatch. Whether
`AuthorizationCredential.GLOBAL_COMMUNITY_READ` itself is scoped by "the
matching ten" credential removals in Slice B is a product/data question
this fix pass does not have the standing to answer unilaterally — the
notifications service's actual dependency on this read grant needs
verifying against its live API usage before either replacing it with a
`feature-*` role or removing it outright.

**Action taken now:** the seed entry in `users.json` is left AS-IS (no
runtime behaviour change) — this is a flagged verification, not a defect to
fix blind. **Action required before Slice B (T077/T082):** the Slice B
implementer MUST resolve this explicitly, in one of two ways, before
`T077` deletes any retired enum values and `T082` deletes retired
credential rows:
1. Verify (against the `notifications` repo's API usage) that the
   `notifications@alkem.io` account does not actually need broad community
   read, and drop the credential from `users.json` — or
2. Confirm it does, and either keep `GLOBAL_COMMUNITY_READ` a live,
   non-retired credential (i.e. it is NOT one of "the matching ten"), or
   replace the seed entry with the appropriate `feature-*` role before the
   credential type is deleted.

Left unresolved, T082's forward-only DML would delete this account's
`global-community-read` credential row the next time the platform seeds a
fresh bootstrap after Slice B ships, silently withdrawing whatever read
access the notifications integration depends on.
