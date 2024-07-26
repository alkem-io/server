import ConfigUtils from './config.utils';

describe('ConfigUtils', () => {
  describe('parseHMSString', () => {
    it('can parse a full DHMS string', () => {
      const hms = '2d12h34m56s';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(218096);
    });

    it('can parse a HMS string', () => {
      const hms = '12h34m56s';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(45296);
    });

    it('can parse just seconds', () => {
      const hms = '41s';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(41);
    });

    it('can parse a string with order of units mixed up', () => {
      const hms = '56s12h34m';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(45296);
    });

    it('can parse a string with some unit having 0', () => {
      const hms = '0d12h34m56s';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(45296);
    });

    it('gives undefined for an empty string', () => {
      const hms = '';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(undefined);
    });

    it('ignores unknown units', () => {
      const hms = '12h1w34m56s1234ms';
      const result = ConfigUtils.parseHMSString(hms);
      expect(result).toBe(45296);
    });
  });
});
