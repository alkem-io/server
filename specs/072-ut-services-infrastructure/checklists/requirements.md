# Requirements Checklist

- [x] All new test files use Vitest 4.x globals (describe, it, expect, vi)
- [x] All new test files use NestJS Test.createTestingModule for DI
- [x] Mock providers follow project conventions (MockWinstonProvider, MockCacheManager, defaultMockerFactory)
- [x] Tests are co-located with source files as *.spec.ts
- [x] No real external connections (RabbitMQ, DB, Redis) in unit tests
- [x] Coverage target: >=80% statement coverage for infrastructure area
- [x] All tests pass: `npx vitest run src/services/infrastructure`
- [x] Lint passes: `pnpm lint`
- [x] Type check passes: `pnpm exec tsc --noEmit`
- [x] Commit message follows convention
