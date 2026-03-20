import type { Driver } from 'typeorm';
import { vi } from 'vitest';
import fixUUIDColumnType from './fix.uuid.column.type';

describe('fixUUIDColumnType', () => {
  const createMockDriver = (): Driver => {
    return {
      normalizeType: vi.fn().mockReturnValue('original-type'),
    } as unknown as Driver;
  };

  it('should preserve the original normalizeType as oldNormalizeType', () => {
    const driver = createMockDriver();
    const originalNormalizeType = driver.normalizeType;

    const fixed = fixUUIDColumnType(driver);

    expect(fixed.oldNormalizeType).toBe(originalNormalizeType);
  });

  it('should return "uuid" for uuid column type', () => {
    const driver = createMockDriver();
    const fixed = fixUUIDColumnType(driver);

    const result = fixed.normalizeType({ type: 'uuid' });

    expect(result).toBe('uuid');
  });

  it('should return "uuid" for char(36) column type with numeric length', () => {
    const driver = createMockDriver();
    const fixed = fixUUIDColumnType(driver);

    const column = { type: 'char' as const, length: 36 };
    const result = fixed.normalizeType(column);

    expect(result).toBe('uuid');
    expect(column.length).toBeUndefined();
  });

  it('should return "uuid" for char(36) column type with string length', () => {
    const driver = createMockDriver();
    const fixed = fixUUIDColumnType(driver);

    const column = { type: 'char' as const, length: '36' };
    const result = fixed.normalizeType(column);

    expect(result).toBe('uuid');
    expect(column.length).toBeUndefined();
  });

  it('should delegate to original normalizeType for non-UUID types', () => {
    const driver = createMockDriver();
    const fixed = fixUUIDColumnType(driver);

    const column = { type: 'varchar' as const, length: 255 };
    const result = fixed.normalizeType(column);

    expect(result).toBe('original-type');
    expect(fixed.oldNormalizeType).toHaveBeenCalledWith(column);
  });

  it('should delegate to original normalizeType for char with non-36 length', () => {
    const driver = createMockDriver();
    const fixed = fixUUIDColumnType(driver);

    const column = { type: 'char' as const, length: 10 };
    const result = fixed.normalizeType(column);

    expect(result).toBe('original-type');
    expect(fixed.oldNormalizeType).toHaveBeenCalledWith(column);
  });

  it('should return the modified driver', () => {
    const driver = createMockDriver();
    const fixed = fixUUIDColumnType(driver);

    expect(fixed).toBe(driver);
  });
});
