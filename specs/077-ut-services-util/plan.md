# Plan: Unit Tests for src/services/util

## Summary

Write a single spec file (`ack.spec.ts`) co-located with `ack.ts` to cover the `ack()` utility function. The function is a thin wrapper that delegates to amqplib's `channel.ack()`.

## Approach

1. Mock `RmqContext` with `getChannelRef()` and `getMessage()` stubs.
2. Mock the `Channel` object with an `ack` spy.
3. Call `ack(context)` and verify the delegation chain.

## Test Structure

- `describe('ack')` block with 2 test cases:
  - Calls `channel.ack` with the original message
  - Calls `getChannelRef` and `getMessage` on the context

## Dependencies

- Vitest (`vi.fn()` for mocks)
- No NestJS Test module needed (pure function, no DI)

## Estimated Effort

Minimal -- single test file, ~30 lines.
