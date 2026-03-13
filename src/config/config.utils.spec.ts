import ConfigUtils from './config.utils';

describe('ConfigUtils', () => {
  describe('parseHMSString', () => {
    it('should parse seconds only', () => {
      expect(ConfigUtils.parseHMSString('45s')).toBe(45);
    });

    it('should parse minutes only', () => {
      expect(ConfigUtils.parseHMSString('10m')).toBe(600);
    });

    it('should parse hours only', () => {
      expect(ConfigUtils.parseHMSString('2h')).toBe(7200);
    });

    it('should parse days only', () => {
      expect(ConfigUtils.parseHMSString('1d')).toBe(86400);
    });

    it('should parse combined duration string', () => {
      // 1d12h34m56s = 86400 + 43200 + 2040 + 56 = 131696
      expect(ConfigUtils.parseHMSString('1d12h34m56s')).toBe(131696);
    });

    it('should parse hours and minutes', () => {
      // 2h30m = 7200 + 1800 = 9000
      expect(ConfigUtils.parseHMSString('2h30m')).toBe(9000);
    });

    it('should return undefined for empty string', () => {
      expect(ConfigUtils.parseHMSString('')).toBeUndefined();
    });

    it('should return undefined for string with no matching pattern', () => {
      expect(ConfigUtils.parseHMSString('abc')).toBeUndefined();
    });

    it('should return 0 for zero values', () => {
      expect(ConfigUtils.parseHMSString('0s')).toBe(0);
    });

    it('should ignore unknown unit suffixes', () => {
      // 5x matches regex (\d+)(\D+) but 'x' is not in the switch cases
      expect(ConfigUtils.parseHMSString('5x')).toBe(0);
    });

    it('should handle mixed known and unknown units', () => {
      // 10m5x = 600 + 0 = 600
      expect(ConfigUtils.parseHMSString('10m5x')).toBe(600);
    });
  });
});
