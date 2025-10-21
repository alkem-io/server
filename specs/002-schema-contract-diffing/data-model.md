# Data Model: Schema Contract Diffing & Enforcement

Status: Draft
Feature: 002-schema-contract-diffing
Date: 2025-10-07

## Scope

Logical (spec-level) data structures used by the schema diff & enforcement pipeline. These are NOT persistence ORM entities yet— they define the shape of artifacts and in-memory representations for diff computation and reporting.

## Naming Conventions

- All element identifiers use fully qualified path form: `TypeName.fieldName` for fields; `TypeName` for types; `TypeName.ENUM_VALUE` for enum values; `ScalarName` for scalars.
- Timestamps are UTC ISO8601.

## Entities

### 1. SchemaSnapshot

Represents the canonical GraphQL SDL at a point in time.
Fields:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | Hash of normalized SDL (e.g., SHA256) |
| createdAt | string (ISO) | yes | Generation time |
| sdl | string | yes | Full schema SDL (deterministically ordered) |
| version | integer | yes | Incrementing snapshot version (starts at 1) |
| previousSnapshotId | string | no | Hash of prior snapshot (null for baseline) |
| elementCount | integer | yes | Number of named type definitions (types + enums + scalars + interfaces + unions + input types) |
| jsonScalarMeta[] | ScalarJsonMeta[] | no | Optional derived metadata for custom scalars |

### 2. ScalarJsonMeta

| Field | Type | Required | Notes |
| name | string | yes | Scalar name |
| jsonTypeCategory | enum(string|number|boolean|object|array|unknown) | yes | Normalized serialized JSON category |
| sourceHash | string | no | Hash of scalar implementation file (for heuristics) |

### 3. ChangeReport

Aggregates detected differences between previous and current snapshot.
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| snapshotId | string | yes | Current snapshot hash |
| baseSnapshotId | string | yes | Prior snapshot hash (or null baseline indicator) |
| generatedAt | string (ISO) | yes | Time diff produced |
| classifications | ClassificationCount | yes | Counts by category |
| entries | ChangeEntry[] | yes | Detailed element changes |
| overrideApplied | boolean | yes | True if BREAKING or PREMATURE_REMOVAL override phrase validated |
| overrideReviewer | string | no | CODEOWNER username if override applied |
| enumLifecycleEvaluations | EnumLifecycleEvaluation[] | no | Detailed evaluation objects |
| scalarEvaluations | ScalarChangeEvaluation[] | no | Scalar-focused evaluations |
| notes | string[] | no | Free-form informational notes |

### 4. ClassificationCount

| Field | Type | Required | Notes |
| additive | integer | yes | Count of ADDITIVE entries |
| deprecated | integer | yes | Count newly deprecated entries |
| breaking | integer | yes | Count of BREAKING entries (pre-override) |
| prematureRemoval | integer | yes | PREMATURE_REMOVAL count |
| invalidDeprecation | integer | yes | INVALID_DEPRECATION_FORMAT count |
| info | integer | yes | Description-only changes |
| deprecationGrace | integer | yes | DEPRECATION_GRACE warning entries |
| baseline | integer | yes | BASELINE pseudo entry count (0 or 1) |

### 5. ChangeEntry

| Field | Type | Required | Notes |
| id | string | yes | Unique internal id (e.g., UUID) |
| element | string | yes | Fully qualified element path |
| elementType | enum(TYPE|FIELD|ENUM_VALUE|SCALAR) | yes | Nature of element |
| changeType | enum(ADDITIVE|DEPRECATED|DEPRECATION_GRACE|INVALID_DEPRECATION_FORMAT|BREAKING|PREMATURE_REMOVAL|INFO|BASELINE) | yes | Classification taxonomy |
| detail | string | yes | Human-readable description |
| previous | any | no | Prior representation snippet |
| current | any | no | Current representation snippet |
| deprecationFormatValid | boolean | no | For deprecated elements (FR-016) |
| removeAfter | string (date) | no | Parsed removal date if present |
| sinceDate | string (date) | no | First deprecation appearance date |
| override | boolean | no | True if override covers this BREAKING or PREMATURE_REMOVAL change |
| grace | boolean | no | True if classification is DEPRECATION_GRACE |
| graceExpiresAt | string (ISO) | no | Timestamp end of grace window |

### 6. EnumLifecycleEvaluation

| Field | Type | Required | Notes |
| enumValue | string | yes | Format: TypeName.ENUM_VALUE |
| sinceDate | string (date) | yes | Derived from first snapshot with deprecation |
| removeAfter | string (date) | yes | From annotation |
| daysBetween | integer | yes | removeAfter - sinceDate (days) |
| removalAttempted | boolean | yes | Is value absent in current snapshot |
| allowedToRemove | boolean | yes | Lifecycle conditions satisfied |
| classification | enum(BREAKING|PREMATURE_REMOVAL|ALLOWED) | yes | Lifecycle outcome |

### 7. ScalarChangeEvaluation

| Field | Type | Required | Notes |
| scalarName | string | yes | Scalar identifier |
| jsonTypePrevious | string | no | Previous category |
| jsonTypeCurrent | string | yes | Current category |
| behaviorChangeClassification | enum(NON_BREAKING|BREAKING) | yes | Derived per FR-017/FR-018 |
| reason | string | yes | Explanation (e.g., "Description text only", "JSON type changed: string→number") |

### 8. DeprecationEntry

Represents active (still present) deprecations and recently retired elements.
| Field | Type | Required | Notes |
| element | string | yes | Fully qualified path |
| elementType | enum(FIELD|ENUM_VALUE) | yes | Scope restricted for now |
| sinceDate | string (date) | yes | First snapshot deprecation detected |
| removeAfter | string (date) | yes | Parsed date from annotation |
| humanReason | string | yes | Text after separator |
| formatValid | boolean | yes | Parsed & validated |
| retired | boolean | yes | True if element removed after lifecycle conditions satisfied |
| retirementDate | string (date) | no | Date removed (YYYY-MM-DD) |

## Relationships

- ChangeReport.entries references SchemaSnapshot via `snapshotId` & `baseSnapshotId`.
- DeprecationEntry set derivable from snapshot pair + git history (Phase 1: snapshot pair only; sinceDate approximated to previous snapshot generation date if newly deprecated).
- EnumLifecycleEvaluation entries augment ChangeEntry items for enum removals; they are cross-referenced by `element`.

## Constraints

- `removeAfter` must be >= (sinceDate + 90 days) for enum values (enforced in classification).
- Baseline snapshot (no prior): ChangeReport.entries includes a BASELINE entry; `classifications.baseline=1`; other counts zero.
- All ISO dates truncated to YYYY-MM-DD for comparisons.

## Future Extensions (Deferred)

- Persist full historical timeline for each element (array of snapshots where changed).
- Introduce `ArgumentChangeEntry` once argument-level diff is in scope.
- Add `schemaVersionSemantic` if future semantic versioning is layered.

## Alignment Mapping

- FR-001: SchemaSnapshot.sdl & id
- FR-002: ChangeReport.entries.changeType taxonomy
- FR-003: ChangeEntry.override + ChangeReport.overrideApplied
- FR-004/FR-015: ChangeEntry.removeAfter / sinceDate / deprecationFormatValid
- FR-011/FR-012: EnumLifecycleEvaluation fields
- FR-013–FR-016: DeprecationEntry.formatValid, removeAfter, humanReason
  FR-017–FR-019: ScalarChangeEvaluation jsonType\* + classification (unknown inference permitted)
  FR-023: JSON Schema validation of artifacts (schema:validate)
  FR-024: Per-entry override flag for BREAKING & PREMATURE_REMOVAL
  FR-025: Baseline classification & baseline count field
  FR-026: Performance budget (diff & bootstrap) – non-field constraint
  FR-027: Unknown scalar jsonType category `unknown`
  FR-028: Grace metadata fields (`grace`, `graceExpiresAt`)
  FR-029: Retirement metadata (`retired`, `retirementDate`)
  FR-030: ClassificationCount.baseline key

---

Prepared by: Spec automation agent
