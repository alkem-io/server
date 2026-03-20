# Specification: Unit Tests for profile-documents

## Overview

Add unit tests for `src/domain/profile-documents/profile.documents.service.ts` to achieve >= 80% coverage across all coverage metrics (statements, branches, functions, lines).

## Scope

### In Scope

- `ProfileDocumentsService.reuploadFileOnStorageBucket()` -- all code paths including exception branches
- `ProfileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket()` -- markdown URL replacement logic
- Private helper methods (`escapeRegExp`, `replaceAll`) exercised through public API

### Out of Scope

- `profile.documents.module.ts` (declarative NestJS module, excluded by convention)
- Integration/E2E tests
- Changes to production code

## Target File

| Source File | Test File |
|---|---|
| `profile.documents.service.ts` | `profile.documents.service.spec.ts` (existing, enhanced) |

## Success Criteria

- All tests pass (`npx vitest run src/domain/profile-documents`)
- Coverage >= 80% on statements, branches, functions, and lines
- No lint or type-check errors
