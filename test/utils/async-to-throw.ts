import Matchers = jest.Matchers;
import Expect = jest.Expect;

type toThrowParameters = Parameters<Matchers<void, any>['toThrow']>[0];
type expectParameters = Parameters<Expect>[0];

export const asyncToThrow = async (
  actual: expectParameters,
  error?: toThrowParameters
) => await expect(actual).rejects.toThrow(error);
