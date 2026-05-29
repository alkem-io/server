import { type MockInstance, vi } from 'vitest';
import { generateNameId } from './generate.name.id';
import { generateTestData } from './generate.name.id.test.data';

describe('Generate name ID', () => {
  let randomSpy: MockInstance;

  // Per-test spy lifecycle (FR-009): scoping the Math.random spy to
  // beforeEach/afterEach eliminates the leakage class entirely — a single
  // failing test can no longer poison Math.random for sibling test files.
  // beforeAll/afterAll would have the same average behaviour but exposes
  // the spy to leak if afterAll skipped on early termination.
  beforeEach(() => {
    // unrandomize the characters when extending the nameID when min length is not met
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1); // 0.1 * 36 = 3.6 -> 3 -> d
  });
  afterEach(() => {
    randomSpy.mockRestore();
  });
  const testData = generateTestData('d');

  it.each(testData)('$input', ({ input, output: expected }) => {
    const received = generateNameId(input);
    expect(received).toEqual(expected);
  });
});
