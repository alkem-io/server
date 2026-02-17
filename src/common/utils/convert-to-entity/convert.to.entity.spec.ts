import { convertToEntity } from './convert.to.entity';

describe('convertToEntity', () => {
  it('should strip the prefix from all keys', () => {
    const prefixed = {
      space_id: '123',
      space_name: 'Test Space',
      space_active: true,
    };

    const result = convertToEntity(prefixed, 'space_');
    expect(result).toEqual({
      id: '123',
      name: 'Test Space',
      active: true,
    });
  });

  it('should handle an empty object', () => {
    const prefixed = {} as Record<string, never>;
    const result = convertToEntity(prefixed, 'prefix_');
    expect(result).toEqual({});
  });

  it('should handle single-key objects', () => {
    const prefixed = { user_email: 'test@example.com' };
    const result = convertToEntity(prefixed, 'user_');
    expect(result).toEqual({ email: 'test@example.com' });
  });

  it('should preserve null and undefined values', () => {
    const prefixed = {
      item_a: null,
      item_b: undefined,
      item_c: 'value',
    };
    const result = convertToEntity(prefixed, 'item_');
    expect(result).toEqual({ a: null, b: undefined, c: 'value' });
  });

  it('should handle numeric values', () => {
    const prefixed = { col_count: 42, col_ratio: 3.14 };
    const result = convertToEntity(prefixed, 'col_');
    expect(result).toEqual({ count: 42, ratio: 3.14 });
  });

  it('should handle nested object values without transforming them', () => {
    const nested = { x: 1, y: 2 };
    const prefixed = { data_coords: nested, data_label: 'point' };
    const result = convertToEntity(prefixed, 'data_');
    expect(result).toEqual({ coords: nested, label: 'point' });
    // Should be the same reference, not a deep copy
    expect(result.coords).toBe(nested);
  });

  it('should work with a long prefix', () => {
    const prefixed = {
      very_long_prefix_id: 'abc',
      very_long_prefix_name: 'test',
    };
    const result = convertToEntity(prefixed, 'very_long_prefix_');
    expect(result).toEqual({ id: 'abc', name: 'test' });
  });
});
