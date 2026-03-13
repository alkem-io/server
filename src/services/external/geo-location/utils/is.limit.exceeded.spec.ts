import { isLimitExceeded } from './is.limit.exceeded';

describe('isLimitExceeded', () => {
  it('should return true when calls equal the allowed limit', () => {
    expect(isLimitExceeded({ start: Date.now(), calls: 5 }, 5)).toBe(true);
  });

  it('should return true when calls exceed the allowed limit', () => {
    expect(isLimitExceeded({ start: Date.now(), calls: 10 }, 5)).toBe(true);
  });

  it('should return false when calls are below the allowed limit', () => {
    expect(isLimitExceeded({ start: Date.now(), calls: 3 }, 5)).toBe(false);
  });

  it('should return false when calls are zero', () => {
    expect(isLimitExceeded({ start: Date.now(), calls: 0 }, 5)).toBe(false);
  });

  it('should return true when allowed limit is zero and calls are zero', () => {
    expect(isLimitExceeded({ start: Date.now(), calls: 0 }, 0)).toBe(true);
  });
});
