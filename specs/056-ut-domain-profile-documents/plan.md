# Plan: Unit Tests for profile-documents

## Analysis

The `profile-documents` area contains a single service (`ProfileDocumentsService`) with two public methods and two private helpers. An existing test file covers 7 scenarios but misses the two exception-throwing branches (lines 44 and 58).

## Approach

1. Analyze existing coverage gaps using `vitest --coverage`
2. Add tests for the two uncovered exception paths:
   - `EntityNotInitializedException` when `storageBucket.documents` is not initialized
   - `EntityNotFoundException` when `getDocumentFromURL` returns falsy
3. Verify coverage meets the >= 80% threshold
4. Run lint and type-check to ensure no regressions

## Effort Estimate

- Classification: Agentic path (< 50 LOC added, well-defined scope)
- Estimated time: < 30 minutes
