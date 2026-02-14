import { isDefined } from './is.defined';

describe('isDefined', () => {
  it.each([
    { value: 0, expected: true },
    { value: '', expected: true },
    { value: false, expected: true },
    { value: 'hello', expected: true },
    { value: 42, expected: true },
    { value: [], expected: true },
    { value: {}, expected: true },
  ])(
    'should return true for defined value: $value',
    ({ value, expected }) => {
      expect(isDefined(value)).toBe(expected);
    }
  );

  it.each([
    { value: undefined, description: 'undefined' },
    { value: null, description: 'null' },
  ])(
    'should return false for $description',
    ({ value }) => {
      expect(isDefined(value)).toBe(false);
    }
  );

  it('should act as a type guard when filtering arrays', () => {
    const input: (number | undefined | null)[] = [1, undefined, 2, null, 3];
    const result: number[] = input.filter(isDefined);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return true for NaN since it is a defined value', () => {
    expect(isDefined(NaN)).toBe(true);
  });
});
