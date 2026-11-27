import { isErrorResponseDebugEnabled } from './error.response.debug';

describe('isErrorResponseDebugEnabled', () => {
  const original = process.env.ERROR_RESPONSE_DEBUG;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = original;
    }
  });

  it('is on for the exact string true', () => {
    process.env.ERROR_RESPONSE_DEBUG = 'true';
    expect(isErrorResponseDebugEnabled()).toBe(true);
  });

  it('is off when unset', () => {
    delete process.env.ERROR_RESPONSE_DEBUG;
    expect(isErrorResponseDebugEnabled()).toBe(false);
  });

  it.each([
    '',
    'TRUE',
    'True',
    '1',
    'yes',
    ' true',
    'true ',
  ])('is off for %j', value => {
    process.env.ERROR_RESPONSE_DEBUG = value;
    expect(isErrorResponseDebugEnabled()).toBe(false);
  });
});
