import { getIndexPattern } from './get.index.pattern';

describe('getIndexPattern', () => {
  it('should return the configured index pattern', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue('custom-pattern-'),
    } as any;
    expect(getIndexPattern(mockConfigService)).toBe('custom-pattern-');
    expect(mockConfigService.get).toHaveBeenCalledWith('search.index_pattern', {
      infer: true,
    });
  });

  it('should return default pattern when config returns null', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue(null),
    } as any;
    expect(getIndexPattern(mockConfigService)).toBe('alkemio-data-');
  });

  it('should return default pattern when config returns undefined', () => {
    const mockConfigService = {
      get: vi.fn().mockReturnValue(undefined),
    } as any;
    expect(getIndexPattern(mockConfigService)).toBe('alkemio-data-');
  });
});
