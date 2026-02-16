import { getRandomId } from './random.id.generator.util';

describe('getRandomId', () => {
  it('should return a number', () => {
    expect(typeof getRandomId()).toBe('number');
  });

  it('should return an integer', () => {
    const id = getRandomId();
    expect(Number.isInteger(id)).toBe(true);
  });

  it('should return a value in the range [0, 99]', () => {
    // Run many times to increase confidence in the range
    for (let i = 0; i < 200; i++) {
      const id = getRandomId();
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(100);
    }
  });

  it('should produce varying values across calls', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 100; i++) {
      ids.add(getRandomId());
    }
    // Should produce more than one unique value
    expect(ids.size).toBeGreaterThan(1);
  });
});
