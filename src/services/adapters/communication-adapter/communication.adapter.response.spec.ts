import {
  ErrCodeActorNotFound,
  ErrCodeInternalError,
  ErrCodeInvalidParam,
  ErrCodeMatrixError,
  ErrCodeNotAllowed,
  ErrCodeRoomNotFound,
  ErrCodeSpaceNotFound,
} from '@alkemio/matrix-adapter-lib';
import {
  extractErrorInfo,
  formatBatchResultForLog,
  getErrorCodeDescription,
  isBatchOperationSuccessful,
  isNotFoundError,
  isValidationError,
  processBatchResponse,
} from './communication.adapter.response';

describe('communication.adapter.response utilities', () => {
  describe('getErrorCodeDescription', () => {
    it('should return description for ErrCodeInvalidParam', () => {
      expect(getErrorCodeDescription(ErrCodeInvalidParam)).toBe(
        'Invalid parameter provided'
      );
    });

    it('should return description for ErrCodeRoomNotFound', () => {
      expect(getErrorCodeDescription(ErrCodeRoomNotFound)).toBe(
        'Room not found in communication system'
      );
    });

    it('should return description for ErrCodeSpaceNotFound', () => {
      expect(getErrorCodeDescription(ErrCodeSpaceNotFound)).toBe(
        'Space not found in communication system'
      );
    });

    it('should return description for ErrCodeActorNotFound', () => {
      expect(getErrorCodeDescription(ErrCodeActorNotFound)).toBe(
        'Actor not found in communication system'
      );
    });

    it('should return description for ErrCodeMatrixError', () => {
      expect(getErrorCodeDescription(ErrCodeMatrixError)).toBe(
        'Matrix protocol error'
      );
    });

    it('should return description for ErrCodeInternalError', () => {
      expect(getErrorCodeDescription(ErrCodeInternalError)).toBe(
        'Internal adapter error'
      );
    });

    it('should return description for ErrCodeNotAllowed', () => {
      expect(getErrorCodeDescription(ErrCodeNotAllowed)).toBe(
        'Operation not allowed'
      );
    });

    it('should return description for unknown error code', () => {
      expect(getErrorCodeDescription(999 as any)).toBe(
        'Unknown error code: 999'
      );
    });
  });

  describe('isNotFoundError', () => {
    it('should return true for room not found', () => {
      expect(isNotFoundError(ErrCodeRoomNotFound)).toBe(true);
    });

    it('should return true for space not found', () => {
      expect(isNotFoundError(ErrCodeSpaceNotFound)).toBe(true);
    });

    it('should return true for actor not found', () => {
      expect(isNotFoundError(ErrCodeActorNotFound)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isNotFoundError(ErrCodeInvalidParam)).toBe(false);
      expect(isNotFoundError(ErrCodeMatrixError)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for invalid param', () => {
      expect(isValidationError(ErrCodeInvalidParam)).toBe(true);
    });

    it('should return true for not allowed', () => {
      expect(isValidationError(ErrCodeNotAllowed)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isValidationError(ErrCodeRoomNotFound)).toBe(false);
      expect(isValidationError(ErrCodeInternalError)).toBe(false);
    });
  });

  describe('extractErrorInfo', () => {
    it('should return undefined for successful response', () => {
      expect(extractErrorInfo({ success: true } as any)).toBeUndefined();
    });

    it('should return undefined when no error object', () => {
      expect(
        extractErrorInfo({ success: false, error: undefined } as any)
      ).toBeUndefined();
    });

    it('should extract error info from failed response', () => {
      const result = extractErrorInfo({
        success: false,
        error: {
          code: ErrCodeRoomNotFound,
          message: 'Room not found',
          details: 'room-123',
        },
      } as any);

      expect(result).toEqual({
        code: ErrCodeRoomNotFound,
        message: 'Room not found',
        details: 'room-123',
      });
    });
  });

  describe('processBatchResponse', () => {
    it('should process successful batch', () => {
      const result = processBatchResponse({
        BaseResponse: { success: true } as any,
        results: {
          'item-1': { success: true } as any,
          'item-2': { success: true } as any,
        },
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.itemResults.get('item-1')).toBe(true);
    });

    it('should process mixed batch', () => {
      const result = processBatchResponse({
        BaseResponse: { success: false } as any,
        results: {
          'item-1': { success: true } as any,
          'item-2': {
            success: false,
            error: { code: ErrCodeRoomNotFound, message: 'Not found' },
          } as any,
        },
      });

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.itemErrors.has('item-2')).toBe(true);
    });

    it('should handle empty results', () => {
      const result = processBatchResponse({
        BaseResponse: { success: true } as any,
      });

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });

    it('should handle failed item without error object', () => {
      const result = processBatchResponse({
        BaseResponse: { success: false } as any,
        results: {
          'item-1': { success: false } as any,
        },
      });

      expect(result.failureCount).toBe(1);
      expect(result.itemErrors.has('item-1')).toBe(false);
    });
  });

  describe('formatBatchResultForLog', () => {
    it('should format successful result', () => {
      const log = formatBatchResultForLog({
        success: true,
        successCount: 3,
        failureCount: 0,
        itemResults: new Map(),
        itemErrors: new Map(),
      });

      expect(log).toContain('success=true');
      expect(log).toContain('succeeded=3');
      expect(log).toContain('failed=0');
    });

    it('should include failure details', () => {
      const log = formatBatchResultForLog({
        success: false,
        successCount: 1,
        failureCount: 2,
        itemResults: new Map(),
        itemErrors: new Map([
          ['id-1', { code: ErrCodeRoomNotFound, message: 'Not found' } as any],
          [
            'id-2',
            { code: ErrCodeInternalError, message: 'Internal error' } as any,
          ],
        ]),
      });

      expect(log).toContain('failed=2');
      expect(log).toContain('id-1');
    });

    it('should add ellipsis when more than 5 failures', () => {
      const errors = new Map<string, any>();
      for (let i = 0; i < 7; i++) {
        errors.set(`id-${i}`, { code: ErrCodeInternalError, message: 'err' });
      }

      const log = formatBatchResultForLog({
        success: false,
        successCount: 0,
        failureCount: 7,
        itemResults: new Map(),
        itemErrors: errors,
      });

      expect(log).toContain('...');
    });
  });

  describe('isBatchOperationSuccessful', () => {
    const makeResult = (s: number, f: number) => ({
      success: f === 0,
      successCount: s,
      failureCount: f,
      itemResults: new Map(),
      itemErrors: new Map(),
    });

    it('should use "all" criteria by default', () => {
      expect(isBatchOperationSuccessful(makeResult(3, 0))).toBe(true);
      expect(isBatchOperationSuccessful(makeResult(2, 1))).toBe(false);
    });

    it('should support "any" criteria', () => {
      expect(isBatchOperationSuccessful(makeResult(1, 2), 'any')).toBe(true);
      expect(isBatchOperationSuccessful(makeResult(0, 2), 'any')).toBe(false);
    });

    it('should support "majority" criteria', () => {
      expect(isBatchOperationSuccessful(makeResult(3, 1), 'majority')).toBe(
        true
      );
      expect(isBatchOperationSuccessful(makeResult(1, 3), 'majority')).toBe(
        false
      );
    });

    it('should fallback to success field for unknown criteria', () => {
      expect(
        isBatchOperationSuccessful(makeResult(0, 0), 'unknown' as any)
      ).toBe(true);
    });
  });
});
