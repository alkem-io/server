import { LogContext } from '@common/enums';
import { isWingbackException, WingbackException } from './wingback.exception';

describe('WingbackException', () => {
  describe('isWingbackException', () => {
    it('should return true for a WingbackException instance', () => {
      const exception = new WingbackException(
        'test error',
        LogContext.WINGBACK,
        500,
        'Internal Server Error',
        { url: '/test', method: 'get' }
      );
      expect(isWingbackException(exception)).toBe(true);
    });

    it('should return false for a standard Error', () => {
      const error = new Error('test');
      expect(isWingbackException(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isWingbackException(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isWingbackException(undefined)).toBe(false);
    });

    it('should return false for a plain object', () => {
      expect(isWingbackException({ message: 'test' })).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should store all properties', () => {
      const exception = new WingbackException(
        'Wingback error',
        LogContext.WINGBACK,
        404,
        'Not Found',
        { url: '/v1/c/customer/123', method: 'get' }
      );

      expect(exception.message).toBe('Wingback error');
      expect(exception.context).toBe(LogContext.WINGBACK);
      expect(exception.status).toBe(404);
      expect(exception.statusText).toBe('Not Found');
      expect(exception.details).toEqual({
        url: '/v1/c/customer/123',
        method: 'get',
      });
    });

    it('should allow optional properties', () => {
      const exception = new WingbackException(
        'Wingback error',
        LogContext.WINGBACK
      );

      expect(exception.status).toBeUndefined();
      expect(exception.statusText).toBeUndefined();
      expect(exception.details).toBeUndefined();
    });
  });
});
