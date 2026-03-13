# Requirements Checklist

## Coverage Requirements
- [ ] `whiteboard.integration.service.ts` >= 80% line coverage
- [ ] `whiteboard.integration.controller.ts` >= 80% line coverage
- [ ] Overall `src/services/whiteboard-integration` >= 80% coverage

## Test Quality
- [ ] All public methods of service have at least one test
- [ ] Error paths are tested (catch blocks)
- [ ] Edge cases covered (empty strings, null guest names, anonymous users)
- [ ] Controller tests verify `ack()` is called for every handler
- [ ] Controller tests verify delegation to service

## Conventions
- [ ] Tests use Vitest 4.x globals
- [ ] Tests are co-located with source files (*.spec.ts)
- [ ] Mocks follow existing pattern (manual vi.fn() construction)
- [ ] No dynamic data in exception messages
- [ ] Lint passes (Biome)
- [ ] TypeScript compiles (tsc --noEmit)
