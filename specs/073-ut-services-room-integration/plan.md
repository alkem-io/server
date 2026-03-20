# Plan: Unit Tests for `src/services/room-integration`

## Approach

Enhance the existing `room.controller.service.spec.ts` by adding test cases for the two uncovered public methods: `getMessages` and `getMessagesInThread`. These methods follow a simple delegation pattern (fetch room, then call lookup service), so tests verify correct delegation and error propagation.

## Implementation Steps

1. Add `describe('getMessages')` block with tests for:
   - Successful message retrieval
   - Propagation of errors from `getRoomOrFail`

2. Add `describe('getMessagesInThread')` block with tests for:
   - Successful thread message retrieval with correct arguments
   - Propagation of errors from `getRoomOrFail`

## Risks

- None. These are straightforward delegation methods with no complex branching.

## Estimated LOC

~50 lines of additional test code.
