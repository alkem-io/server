import { hasOnlyAllowedFields } from '@common/utils';

describe('hasOnlyAllowedFields', () => {
  it('returns true when object contains only allowed fields', () => {
    const obj = { a: 1, b: 2 };
    const allowedFields = { a: true, b: true };
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(true);
  });

  it('returns false when object contains disallowed fields', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const allowedFields = { a: true, b: true };
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(false);
  });

  it('returns true when nested object contains only allowed fields', () => {
    const obj = { a: { b: 2 } };
    const allowedFields = { a: { b: true } };
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(true);
  });

  it('returns false when nested object contains disallowed fields', () => {
    const obj = { a: { b: 2, c: 3 } };
    const allowedFields = { a: { b: true } };
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(false);
  });

  it('returns true when object is empty and allowed fields are empty', () => {
    const obj = {};
    const allowedFields = {};
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(true);
  });

  it('returns false when object is not empty and allowed fields are empty', () => {
    const obj = { a: 1 };
    const allowedFields = {};
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(false);
  });

  it('returns false when object contains disallowed fields with partial structure', () => {
    const obj = { a: 1, b: { c: 2, d: 3 } };
    const allowedFields = { a: true, b: {} };
    expect(hasOnlyAllowedFields(obj, allowedFields)).toBe(false);
  });
});
