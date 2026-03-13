import { getIndexPattern } from './get.index.pattern';

describe('getIndexPattern', () => {
  it('should return the configured index pattern', () => {
    const configService = {
      get: (_key: string, _opts: any) => 'custom-pattern-',
    } as any;

    expect(getIndexPattern(configService)).toBe('custom-pattern-');
  });

  it('should return default pattern when config returns null/undefined', () => {
    const configService = {
      get: (_key: string, _opts: any) => null,
    } as any;

    expect(getIndexPattern(configService)).toBe('alkemio-data-');
  });

  it('should return default pattern when config returns undefined', () => {
    const configService = {
      get: (_key: string, _opts: any) => undefined,
    } as any;

    expect(getIndexPattern(configService)).toBe('alkemio-data-');
  });
});
