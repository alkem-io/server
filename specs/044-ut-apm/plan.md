# Implementation Plan: Unit Test Coverage for src/apm

**Created**: 2026-03-12
**Status**: Complete

## Overview

Add unit tests for the `src/apm` module to achieve >=80% line coverage. The module contains APM instrumentation decorators, utility functions, and an Apollo Server plugin.

## Approach

1. **Remove coverage exclusion**: Remove `src/apm/**` from `vitest.config.ts` coverage.exclude array
2. **Mock strategy**: Mock `elastic-apm-node` and the `apmAgent` export to avoid requiring a live APM server
3. **Test co-location**: Place `.spec.ts` files next to their source files per project convention
4. **Bottom-up testing**: Test utilities first, then decorators, then the plugin

## Files to Create

| Source File | Test File | Key Scenarios |
|---|---|---|
| `decorators/util/copy.metadata.ts` | `copy.metadata.spec.ts` | Copies all metadata keys; handles no metadata |
| `decorators/util/instrument.method.ts` | `instrument.method.spec.ts` | Sync/async/function returns; no transaction; no span |
| `decorators/util/createInstrumentedClassDecorator.ts` | `createInstrumentedClassDecorator.spec.ts` | Enabled/disabled; skipMethods; metadata key filtering |
| `plugins/apm.apollo.plugin.ts` | `apm.apollo.plugin.spec.ts` | didResolveOperation naming; executionDidStart; assignOperationType |

## Dependencies

- Vitest (vi.mock, vi.fn)
- reflect-metadata (for metadata tests)
- No external services required
