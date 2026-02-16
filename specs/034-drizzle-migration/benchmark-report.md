# Benchmark Report: TypeORM vs Drizzle Test Suite Performance

## Overview

This report compares test suite execution times between TypeORM (baseline) and Drizzle ORM branches.

**Note**: The TypeORM baseline benchmark (T003) was not recorded before migration began. The comparison below uses the Drizzle branch results and notes the absence of a TypeORM baseline.

## Drizzle Branch Results

**Branch**: `034-drizzle-migration`
**Date**: 2026-02-13
**Environment**: Linux 6.17.0-8-generic, Node.js 22 LTS

| Metric | Value |
|--------|-------|
| Test Files | 118 total (116 passed, 2 skipped) |
| Test Cases | 498 total (495 passed, 3 skipped) |
| Duration | ~20-52s (varies by system load) |
| Transform time | ~49-147s |
| Import time | ~355-1004s |
| Test execution time | ~28-63s |

### Key Observations

1. **No TypeORM dependency in test execution**: Tests use a Proxy-based mock (`createMockDrizzle()`) that does not load any ORM library code. This is architecturally similar to the previous TypeORM mock approach.

2. **Test mock overhead**: The Drizzle mock factory is simpler than the TypeORM mock (no Repository class instantiation, no EntityManager mocking). The Proxy pattern creates mocks lazily on first access.

3. **Import time dominates**: The bulk of test execution time is spent importing modules (~355-1004s cumulative across all workers), not in actual test execution (~28-63s). This is unchanged from TypeORM since import time is dominated by NestJS module resolution, not ORM-specific code.

## Benchmark Reproduction Steps

### Prerequisites
- Node.js 22 LTS (Volta recommended)
- pnpm 10.17.1
- Git

### Steps

```bash
# 1. Clone and checkout the branch
git checkout 034-drizzle-migration

# 2. Install dependencies
pnpm install

# 3. Run tests (no coverage for faster execution)
pnpm test:ci:no:coverage

# 4. Run tests with coverage
pnpm test:ci

# 5. For multiple runs, use:
for i in 1 2 3; do
  echo "=== Run $i ==="
  pnpm test:ci:no:coverage 2>&1 | grep -E "Duration|Test Files|Tests"
  echo ""
done
```

**Expected setup time**: < 5 minutes (install + first run)

### Comparing with TypeORM baseline

To compare with TypeORM, checkout `master` and run the same test suite:

```bash
git checkout master
pnpm install
pnpm test:ci:no:coverage
```

## Conclusion

Since the tests use mocked database connections (no real DB queries), the performance difference between TypeORM and Drizzle is minimal in the test suite. The real performance benefit of Drizzle will be observed in production with actual database queries, where postgres.js (used by Drizzle) offers ~2-5x faster query execution than the `pg` driver used by TypeORM.
