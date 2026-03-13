import { PaginationArgs } from './pagination.args';
import { tryValidateArgs } from './validate.pagination.args';

describe('tryValidateArgs', () => {
  it('should return true for valid forward pagination', () => {
    const args: PaginationArgs = { first: 10 };
    expect(tryValidateArgs(args)).toBe(true);
  });

  it('should return true for valid backward pagination', () => {
    const args: PaginationArgs = { last: 10 };
    expect(tryValidateArgs(args)).toBe(true);
  });

  it('should return true for forward pagination with cursor', () => {
    const args: PaginationArgs = { first: 10, after: 'cursor-id' };
    expect(tryValidateArgs(args)).toBe(true);
  });

  it('should return true for backward pagination with cursor', () => {
    const args: PaginationArgs = { last: 10, before: 'cursor-id' };
    expect(tryValidateArgs(args)).toBe(true);
  });

  it('should return true when no parameters are provided', () => {
    const args: PaginationArgs = {};
    expect(tryValidateArgs(args)).toBe(true);
  });

  it('should throw when first is zero', () => {
    const args: PaginationArgs = { first: 0 };
    expect(() => tryValidateArgs(args)).toThrow(
      'Parameter "first" needs to be positive.'
    );
  });

  it('should throw when first is negative', () => {
    const args: PaginationArgs = { first: -1 };
    expect(() => tryValidateArgs(args)).toThrow(
      'Parameter "first" needs to be positive.'
    );
  });

  it('should throw when after is provided without first', () => {
    const args: PaginationArgs = { after: 'cursor-id' };
    expect(() => tryValidateArgs(args)).toThrow(
      'Cursor "after" requires having "first" parameter.'
    );
  });

  it('should throw when last is zero', () => {
    const args: PaginationArgs = { last: 0 };
    expect(() => tryValidateArgs(args)).toThrow(
      'Parameter "last" needs to be positive.'
    );
  });

  it('should throw when last is negative', () => {
    const args: PaginationArgs = { last: -5 };
    expect(() => tryValidateArgs(args)).toThrow(
      'Parameter "last" needs to be positive.'
    );
  });

  it('should throw when before is provided without last', () => {
    const args: PaginationArgs = { before: 'cursor-id' };
    expect(() => tryValidateArgs(args)).toThrow(
      'Cursor "before" requires having "last" parameter.'
    );
  });

  it('should throw when both first and last are provided', () => {
    const args: PaginationArgs = { first: 10, last: 5 };
    expect(() => tryValidateArgs(args)).toThrow(
      'Using both "first" and "last" parameters is discouraged.'
    );
  });
});
