# Requirements Checklist

## Coverage Requirements
- [ ] >= 80% statement coverage for `activity.feed.service.ts`
- [ ] >= 80% statement coverage for `activity.feed.resolver.queries.ts`
- [ ] >= 80% overall coverage for `src/domain/activity-feed`

## Test Quality
- [ ] All public methods have at least one test
- [ ] Branch coverage for conditional logic (filterSpacesOrFail, getGroupedActivity retry loop)
- [ ] Mocks follow project conventions (MockWinstonProvider, defaultMockerFactory)
- [ ] Tests are co-located with source files
- [ ] Vitest 4.x globals used (describe, it, expect, vi)

## Code Quality
- [ ] No lint errors (`pnpm lint`)
- [ ] No type errors (`pnpm exec tsc --noEmit`)
- [ ] No console.log statements
- [ ] Path aliases used consistently (@common/*, @core/*, etc.)

## Conventions
- [ ] Test files named `*.spec.ts`
- [ ] NestJS Test module used for DI setup
- [ ] `vi.clearAllMocks()` in afterEach
- [ ] Descriptive test names following existing patterns
