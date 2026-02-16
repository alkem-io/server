import { compareEnums } from './compare.enums';

enum ColorA {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
}

enum ColorB {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
}

enum ColorC {
  Red = 'red',
  Green = 'green',
}

enum NumericA {
  One = 1,
  Two = 2,
}

enum NumericB {
  One = 1,
  Two = 2,
}

enum NumericC {
  One = 1,
  Two = 3,
}

describe('compareEnums', () => {
  it('should return true for two identical string enums', () => {
    expect(compareEnums(ColorA, ColorB as any)).toBe(true);
  });

  it('should return false when enums have different number of keys', () => {
    expect(compareEnums(ColorA, ColorC as unknown as typeof ColorA)).toBe(
      false
    );
  });

  it('should return true for identical numeric enums', () => {
    expect(compareEnums(NumericA, NumericB as any)).toBe(true);
  });

  it('should return false when numeric enum values differ', () => {
    expect(compareEnums(NumericA, NumericC as unknown as typeof NumericA)).toBe(
      false
    );
  });

  it('should return false when keys are same but values differ', () => {
    const enumX = { A: 'x', B: 'y' } as const;
    const enumY = { A: 'x', B: 'z' } as const;
    expect(compareEnums(enumX, enumY as any)).toBe(false);
  });

  it('should return true for two empty objects', () => {
    const empty1 = {} as Record<string, string>;
    const empty2 = {} as Record<string, string>;
    expect(compareEnums(empty1, empty2)).toBe(true);
  });

  it('should return false when first enum has extra keys', () => {
    const enumA = { A: '1', B: '2', C: '3' } as const;
    const enumB = { A: '1', B: '2' } as const;
    expect(compareEnums(enumA, enumB as unknown as typeof enumA)).toBe(false);
  });
});
