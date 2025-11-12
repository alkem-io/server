# Research Findings – Kratos Authentication ID Linking

## Nullable Unique Column Strategy
- **Decision:** Add the `authenticationID` column as `char(36)` nullable with a unique index and backfill only after ensuring existing values are distinct.
- **Rationale:** MySQL unique constraints treat `NULL` values as non-conflicting, allowing legacy rows without authentication IDs while guaranteeing uniqueness once populated; TypeORM can express this via `@Column({ unique: true, nullable: true })` plus an explicit index for clarity.
- **Alternatives considered:** Using a separate mapping table (adds joins and migration overhead); enforcing non-null with placeholder values (breaks invariants and complicates onboarding).

## Backfill Execution Pattern
- **Decision:** Implement the backfill mutation using paged batches (e.g., 200 users per iteration) with transactional writes per batch and Kratos Admin API lookups guarded by exponential backoff on 429/5xx responses.
- **Rationale:** Batched pagination avoids long-lived transactions, limits load on Kratos, and makes reruns idempotent; logging per batch provides observability without overwhelming the logger.
- **Alternatives considered:** Full table cursor with single transaction (risks locks/timeouts); asynchronous queue ingestion (overkill for one-off admin mutation).

## Internal REST Endpoint Hardening
- **Decision:** Host the new `/rest/internal/identity/resolve` endpoint in a dedicated module without request-level guards, validating UUID input and emitting `LogContext.AUTH` audit logs (including caller IP) to trace usage.
- **Rationale:** Maintaining zero request-level authorization honors the approved exception while validation and detailed logging provide the minimum viable safeguards.
- **Alternatives considered:** Shared-secret headers or JWT guards (contradict exemption); fully anonymous endpoint without validation/logging (insufficient observability).
