import { getDiff } from './get.diff';

describe('getDiff', () => {
  it('returns null when objects are identical', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2 };
    const result = getDiff(obj1, obj2);
    expect(result).toBeNull();
  });

  it('returns differences when objects have different values', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 3 };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: 3 });
  });

  it('returns differences when objects have different nested values', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { a: 1, b: { c: 2, d: 4 } };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: { d: 4 } });
  });

  it('returns null when nested objects are identical', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { a: 1, b: { c: 2, d: 3 } };
    const result = getDiff(obj1, obj2);
    expect(result).toBeNull();
  });

  it('returns differences when objects have different keys', () => {
    type Type = { a: number; b?: number; c?: number };
    const obj1: Type = { a: 1, b: 2 };
    const obj2: Type = { a: 1, c: 3 };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: undefined, c: 3 });
  });

  it('returns differences when nested objects have different keys', () => {
    type Type = { a: number; b: { c: number; d?: number; e?: number } };
    const obj1: Type = { a: 1, b: { c: 2, d: 3 } };
    const obj2: Type = { a: 1, b: { c: 2, e: 4 } };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: { d: undefined, e: 4 } });
  });

  it('returns differences when one object has extra keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2, c: 3 };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ c: 3 });
  });

  it('returns differences when nested objects have extra keys', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2, d: 3 } };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: { d: 3 } });
  });
});
