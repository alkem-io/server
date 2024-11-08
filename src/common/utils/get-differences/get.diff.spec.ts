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

  it('returns differences when objects have some different nested values', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { a: 1, b: { c: 2, d: 4 } };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: { d: 4 } });
  });

  it('returns differences when objects have all different nested values', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { a: 1, b: { c: 4, d: 5 } };
    const result = getDiff(obj1, obj2);
    expect(result).toEqual({ b: { c: 4, d: 5 } });
  });

  it('returns null when nested objects are identical', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { a: 1, b: { c: 2, d: 3 } };
    const result = getDiff(obj1, obj2);
    expect(result).toBeNull();
  });

  it('returns null when objects have different keys', () => {
    type Type = { a: number; b?: number; c?: number };
    const obj1: Type = { a: 1, b: 2 };
    const obj2: Type = { a: 1, c: 3 };
    const result = getDiff(obj1, obj2);
    expect(result).toBeNull();
  });
});
