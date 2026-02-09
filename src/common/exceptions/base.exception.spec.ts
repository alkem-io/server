import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

describe('BaseException', () => {
  describe('backward compatibility', () => {
    it('should include both code (string) and numericCode (number) in extensions', () => {
      const exception = new BaseException(
        'Test error message',
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ENTITY_NOT_FOUND
      );

      expect(exception.extensions).toBeDefined();
      expect(exception.extensions?.code).toBe('ENTITY_NOT_FOUND');
      expect(exception.extensions?.numericCode).toBe(10101);
    });

    it('should preserve string code unchanged for FORBIDDEN_POLICY', () => {
      const exception = new BaseException(
        'Access denied',
        LogContext.AUTH,
        AlkemioErrorStatus.FORBIDDEN_POLICY
      );

      expect(exception.extensions?.code).toBe('FORBIDDEN_POLICY');
      expect(exception.extensions?.numericCode).toBe(11104);
    });

    it('should include errorId in extensions', () => {
      const exception = new BaseException(
        'Test error',
        LogContext.COMMUNITY,
        AlkemioErrorStatus.NOT_FOUND
      );

      expect(exception.extensions?.errorId).toBeDefined();
      expect(typeof exception.extensions?.errorId).toBe('string');
    });

    it('should allow custom errorId', () => {
      const customErrorId = 'custom-error-id-123';
      const exception = new BaseException(
        'Test error',
        LogContext.COMMUNITY,
        AlkemioErrorStatus.NOT_FOUND,
        undefined,
        customErrorId
      );

      expect(exception.extensions?.errorId).toBe(customErrorId);
    });

    it('should include details in extensions when provided', () => {
      const details = { userId: 'user-123', operation: 'create' };
      const exception = new BaseException(
        'Test error',
        LogContext.COMMUNITY,
        AlkemioErrorStatus.BAD_USER_INPUT,
        details
      );

      expect(exception.extensions?.details).toEqual(details);
    });
  });

  describe('numeric code mapping', () => {
    it('should map NOT_FOUND category codes correctly', () => {
      const exception = new BaseException(
        'Entity not found',
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ENTITY_NOT_FOUND
      );

      expect(exception.extensions?.numericCode).toBe(10101);
      expect(
        Math.floor((exception.extensions?.numericCode as number) / 1000)
      ).toBe(10);
    });

    it('should map AUTHORIZATION category codes correctly', () => {
      const exception = new BaseException(
        'Access denied',
        LogContext.AUTH,
        AlkemioErrorStatus.FORBIDDEN
      );

      expect(exception.extensions?.numericCode).toBe(11103);
      expect(
        Math.floor((exception.extensions?.numericCode as number) / 1000)
      ).toBe(11);
    });

    it('should map VALIDATION category codes correctly', () => {
      const exception = new BaseException(
        'Invalid input',
        LogContext.API,
        AlkemioErrorStatus.BAD_USER_INPUT
      );

      expect(exception.extensions?.numericCode).toBe(12101);
      expect(
        Math.floor((exception.extensions?.numericCode as number) / 1000)
      ).toBe(12);
    });

    it('should map OPERATIONS category codes correctly', () => {
      const exception = new BaseException(
        'Callout closed',
        LogContext.COLLABORATION,
        AlkemioErrorStatus.CALLOUT_CLOSED
      );

      expect(exception.extensions?.numericCode).toBe(13109);
      expect(
        Math.floor((exception.extensions?.numericCode as number) / 1000)
      ).toBe(13);
    });

    it('should map SYSTEM category codes correctly', () => {
      const exception = new BaseException(
        'Bootstrap failed',
        LogContext.BOOTSTRAP,
        AlkemioErrorStatus.BOOTSTRAP_FAILED
      );

      expect(exception.extensions?.numericCode).toBe(14101);
      expect(
        Math.floor((exception.extensions?.numericCode as number) / 1000)
      ).toBe(14);
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback metadata for UNSPECIFIED status', () => {
      const exception = new BaseException(
        'Test error',
        LogContext.COMMUNITY,
        AlkemioErrorStatus.UNSPECIFIED
      );

      expect(exception.extensions?.numericCode).toBe(99999);
      expect(exception.extensions?.userMessage).toBe('userMessages.fallback');
    });
  });
});
