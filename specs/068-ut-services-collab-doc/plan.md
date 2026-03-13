# Plan: Unit Tests for collaborative-document-integration

## Approach
Agentic path -- scoped test-only changes, no contracts/migrations, low ambiguity.

## Files to Create
1. `src/services/collaborative-document-integration/collaborative-document-integration.controller.spec.ts`
2. `src/services/collaborative-document-integration/outputs/fetch.output.data.spec.ts`
3. `src/services/collaborative-document-integration/outputs/save.output.data.spec.ts`

## Test Strategy

### Controller (6 handlers)
Each handler follows the same pattern: log, ack, delegate. Tests will:
- Mock `CollaborativeDocumentIntegrationService` methods
- Mock `RmqContext` with `getChannelRef()` and `getMessage()`
- Assert delegation and return values

### Type Guards
Simple boolean checks on the presence of the `error` property.

## Risks
- None significant; purely additive test code with no production changes.
