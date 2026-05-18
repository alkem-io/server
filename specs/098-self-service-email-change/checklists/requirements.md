# Specification Quality Checklist: Self-Service Email Change With Ownership Verification

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-05-18
**Last Updated**: 2026-05-18 (verification machinery scope expanded — 097 is now no-verification)
**Feature**: [spec.md](../spec.md)
**Foundational dependency**: `/specs/097-change-user-email/` (admin no-verification MVP must merge first)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed
- [x] Foundation owned by 097 is referenced, not duplicated

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified (and inherited ones from 097 are noted)
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified — 097 is the foundational dependency

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover self-service initiation, token lifecycle, and subject-user read
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 2026-05-18 (initial split): Split from the unified spec 097-change-user-email. Foundation (audit, two-side commit, retry, drift, retention, security signal, session invalidation) is in 097; this spec adds the self-service surface and the FR-022 me-query.
- 2026-05-18 (smaller-MVP follow-up): With 097 trimmed to the no-verification admin MVP, this spec EXPANDS to own the entire email-ownership-verification machinery: the `email_change_pending` entity, the token utility, the multi-step state lifecycle, the session-less `userEmailChangeConfirm` root mutation, the FR-004a confirm-time re-check, the FR-019a atomic-init guarantee, the new `USER_EMAIL_CHANGE_CONFIRMATION` notification event, and the `endpoints.client_web` config key. 097's `adminUserEmailChangeDriftResolve` mutation is extended additively (FR-009b-EXT) to also transition the associated pending row when one exists.
- The `email_change_initiator_role` Postgres enum carries both `self` and `platform_admin` values upfront in 097's data model, so this spec introduces no migration for that enum. This spec DOES extend the `email_change_audit_outcome` Postgres enum additively with 7 new values.
- Ready for `/speckit.plan` — `/speckit.clarify` is optional unless the planning phase surfaces further questions.
