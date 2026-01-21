import type { Assertion, ExpectStatic } from 'vitest';

type toThrowParameters = Parameters<Assertion<void>['toThrow']>[0];
type expectParameters = Parameters<ExpectStatic>[0];

export const asyncToThrow = async (
  actual: expectParameters,
  error?: toThrowParameters
) => await expect(actual).rejects.toThrow(error);
