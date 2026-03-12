# Requirements Checklist

## Coverage Requirements
- [ ] >=80% statement coverage for `src/services/external/`
- [ ] >=80% branch coverage for `src/services/external/`
- [ ] >=80% function coverage for `src/services/external/`

## Quality Requirements
- [ ] All tests pass via `pnpm vitest run src/services/external`
- [ ] No TypeScript errors (`pnpm exec tsc --noEmit`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Tests co-located with source files
- [ ] Tests follow existing project conventions (Vitest globals, NestJS Test module, mock providers)

## Test File Requirements
- [ ] `elasticsearch/utils/is.elastic.error.spec.ts` created
- [ ] `elasticsearch/utils/is.elastic.response.error.spec.ts` created
- [ ] `elasticsearch/utils/handle.elastic.error.spec.ts` created
- [ ] `elasticsearch/elasticsearch-client/elasticsearch.client.factory.spec.ts` created
- [ ] `geo-location/utils/is.limit.exceeded.spec.ts` created
- [ ] `wingback/exceptions/wingback.exception.spec.ts` created
- [ ] `wingback/wingback.manager.spec.ts` created
