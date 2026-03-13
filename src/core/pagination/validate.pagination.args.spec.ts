import { tryValidateArgs } from './validate.pagination.args';

describe('tryValidateArgs', () => {
  it('returns true for empty pagination args', () => {
    expect(
      tryValidateArgs({
        first: undefined,
        after: undefined,
        last: undefined,
        before: undefined,
      })
    ).toBe(true);
  });

  it('returns true when only first is provided', () => {
    expect(
      tryValidateArgs({
        first: 10,
        after: undefined,
        last: undefined,
        before: undefined,
      })
    ).toBe(true);
  });

  it('returns true when first + after are provided', () => {
    expect(
      tryValidateArgs({
        first: 10,
        after: 'cursor-123',
        last: undefined,
        before: undefined,
      })
    ).toBe(true);
  });

  it('returns true when only last is provided', () => {
    expect(
      tryValidateArgs({
        first: undefined,
        after: undefined,
        last: 5,
        before: undefined,
      })
    ).toBe(true);
  });

  it('returns true when last + before are provided', () => {
    expect(
      tryValidateArgs({
        first: undefined,
        after: undefined,
        last: 5,
        before: 'cursor-abc',
      })
    ).toBe(true);
  });

  it('throws when first is <= 0', () => {
    expect(() =>
      tryValidateArgs({
        first: 0,
        after: undefined,
        last: undefined,
        before: undefined,
      })
    ).toThrow('Parameter "first" needs to be positive');
  });

  it('throws when first is negative', () => {
    expect(() =>
      tryValidateArgs({
        first: -1,
        after: undefined,
        last: undefined,
        before: undefined,
      })
    ).toThrow('Parameter "first" needs to be positive');
  });

  it('throws when after is provided without first', () => {
    expect(() =>
      tryValidateArgs({
        first: undefined,
        after: 'cursor-123',
        last: undefined,
        before: undefined,
      })
    ).toThrow('Cursor "after" requires having "first" parameter');
  });

  it('throws when last is <= 0', () => {
    expect(() =>
      tryValidateArgs({
        first: undefined,
        after: undefined,
        last: 0,
        before: undefined,
      })
    ).toThrow('Parameter "last" needs to be positive');
  });

  it('throws when last is negative', () => {
    expect(() =>
      tryValidateArgs({
        first: undefined,
        after: undefined,
        last: -5,
        before: undefined,
      })
    ).toThrow('Parameter "last" needs to be positive');
  });

  it('throws when before is provided without last', () => {
    expect(() =>
      tryValidateArgs({
        first: undefined,
        after: undefined,
        last: undefined,
        before: 'cursor-abc',
      })
    ).toThrow('Cursor "before" requires having "last" parameter');
  });

  it('throws when both first and last are provided', () => {
    expect(() =>
      tryValidateArgs({
        first: 10,
        after: undefined,
        last: 5,
        before: undefined,
      })
    ).toThrow('Using both "first" and "last" parameters is discouraged');
  });
});
