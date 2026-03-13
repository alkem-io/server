import { sorOutputByKeys } from './sort.output.by.keys';

describe('sorOutputByKeys', () => {
  it('should sort output by the order of keys', () => {
    const output = [
      { id: 'c', name: 'C' },
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    const keys = ['a', 'b', 'c'];

    const result = sorOutputByKeys(output, keys);

    expect(result.map(x => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('should handle empty arrays', () => {
    const result = sorOutputByKeys([], []);
    expect(result).toEqual([]);
  });

  it('should handle single element', () => {
    const output = [{ id: 'a', name: 'A' }];
    const keys = ['a'];

    const result = sorOutputByKeys(output, keys);

    expect(result).toEqual([{ id: 'a', name: 'A' }]);
  });

  it('should preserve objects when already in correct order', () => {
    const output = [
      { id: 'x', value: 1 },
      { id: 'y', value: 2 },
    ];
    const keys = ['x', 'y'];

    const result = sorOutputByKeys(output, keys);

    expect(result[0].id).toBe('x');
    expect(result[1].id).toBe('y');
  });

  it('should handle duplicate keys in output', () => {
    const output = [
      { id: 'b', value: 2 },
      { id: 'a', value: 1 },
      { id: 'a', value: 3 },
    ];
    const keys = ['a', 'b'];

    const result = sorOutputByKeys(output, keys);

    expect(result[0].id).toBe('a');
    expect(result[2].id).toBe('b');
  });
});
