# Plan: Unit Tests for src/domain/template

## Approach
Incremental test file creation, co-located with source files. Each new test file targets one source file.

## Priority Order (by coverage impact)
1. Authorization services (6 files) - high branch complexity with switch statements
2. Resolver fields (5 files) - simple delegation but many methods
3. Resolver mutations (4 files) - authorization + delegation patterns
4. License service (1 file) - small but untested

## Test Pattern
- Authorization services: Test `applyAuthorizationPolicy` with each template type, missing relations, and parent authorization inheritance
- Resolver fields: Test each `@ResolveField` method with delegation assertions
- Resolver mutations: Test authorization checks, validation, and delegation
- License service: Test `applyLicensePolicy` with and without collaboration

## Estimated LOC
~600-800 LOC of new test code across ~15 new test files

## Risk
Low - pure unit tests with no schema or migration changes
