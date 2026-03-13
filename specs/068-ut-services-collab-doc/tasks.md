# Tasks: Unit Tests for collaborative-document-integration

## Task 1: Create controller spec
- File: `collaborative-document-integration.controller.spec.ts`
- Test all 6 message handlers (info, who, health, save, fetch, memoContribution)
- Mock RmqContext, logger, and service
- Status: TODO

## Task 2: Create fetch output type guard spec
- File: `outputs/fetch.output.data.spec.ts`
- Test `isFetchErrorData` with FetchContentData and FetchErrorData
- Status: TODO

## Task 3: Create save output type guard spec
- File: `outputs/save.output.data.spec.ts`
- Test `isSaveErrorData` with SaveContentData and SaveErrorData
- Status: TODO

## Task 4: Verify coverage >= 80%
- Run `pnpm vitest run --coverage src/services/collaborative-document-integration`
- Status: TODO

## Task 5: Verify lint and type-check
- Run `pnpm lint` and `pnpm exec tsc --noEmit`
- Status: TODO
