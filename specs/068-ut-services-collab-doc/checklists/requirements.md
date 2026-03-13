# Requirements Checklist

- [ ] Controller spec covers all 6 `@MessagePattern` handlers
- [ ] Each handler test verifies `ack()` is called
- [ ] Each handler test verifies delegation to the correct service method
- [ ] Each handler test verifies the return value
- [ ] `isFetchErrorData` type guard tested for both branches
- [ ] `isSaveErrorData` type guard tested for both branches
- [ ] Tests use Vitest 4.x globals
- [ ] Tests use `MockWinstonProvider` and `defaultMockerFactory`
- [ ] Coverage >= 80% for the area
- [ ] `pnpm lint` passes
- [ ] `pnpm exec tsc --noEmit` passes
