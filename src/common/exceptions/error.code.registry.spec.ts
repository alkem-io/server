import { AlkemioErrorStatus, ErrorCategory } from '@common/enums';
import {
  ERROR_CODE_REGISTRY,
  getErrorCodeEntry,
  validateRegistryCompleteness,
} from './error.code.registry';

describe('ErrorCodeRegistry', () => {
  describe('validateRegistryCompleteness', () => {
    it('should map all AlkemioErrorStatus values (no gaps)', () => {
      const unmapped = validateRegistryCompleteness();
      expect(unmapped).toEqual([]);
    });
  });

  describe('getErrorCodeEntry', () => {
    it('should return 10101 for ENTITY_NOT_FOUND', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.ENTITY_NOT_FOUND);
      expect(entry?.numericCode).toBe(10101);
    });

    it('should return 20104 for FORBIDDEN_POLICY', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.FORBIDDEN_POLICY);
      expect(entry?.numericCode).toBe(20104);
    });

    it('should return 30101 for BAD_USER_INPUT', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.BAD_USER_INPUT);
      expect(entry?.numericCode).toBe(30101);
    });

    it('should return 40102 for CALLOUT_CLOSED', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.CALLOUT_CLOSED);
      expect(entry?.numericCode).toBe(40102);
    });

    it('should return 50110 for STORAGE_UPLOAD_FAILED', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.STORAGE_UPLOAD_FAILED);
      expect(entry?.numericCode).toBe(50110);
    });

    it('should return undefined for unknown status', () => {
      const entry = getErrorCodeEntry('UNKNOWN_STATUS' as AlkemioErrorStatus);
      expect(entry).toBeUndefined();
    });
  });

  describe('getErrorCodeEntry', () => {
    it('should return complete entry for ENTITY_NOT_FOUND', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.ENTITY_NOT_FOUND);
      expect(entry).toBeDefined();
      expect(entry?.numericCode).toBe(10101);
      expect(entry?.category).toBe(ErrorCategory.NOT_FOUND);
      expect(entry?.userMessage).toBe(
        "Couldn't find what you were looking for."
      );
    });

    it('should return undefined for unknown status', () => {
      const entry = getErrorCodeEntry('UNKNOWN_STATUS' as AlkemioErrorStatus);
      expect(entry).toBeUndefined();
    });
  });

  describe('code validation', () => {
    it('should have all codes in valid range 10000-99999', () => {
      for (const status of Object.values(AlkemioErrorStatus)) {
        const entry = ERROR_CODE_REGISTRY.get(status);
        if (entry) {
          expect(entry.numericCode).toBeGreaterThanOrEqual(10000);
          expect(entry.numericCode).toBeLessThanOrEqual(99999);
        }
      }
    });

    it('should have all numeric codes unique (no duplicates)', () => {
      const codes = new Set<number>();
      for (const status of Object.values(AlkemioErrorStatus)) {
        const entry = ERROR_CODE_REGISTRY.get(status);
        if (entry) {
          expect(codes.has(entry.numericCode)).toBe(false);
          codes.add(entry.numericCode);
        }
      }
    });

    it('should have first two digits matching category for all codes', () => {
      for (const status of Object.values(AlkemioErrorStatus)) {
        const entry = ERROR_CODE_REGISTRY.get(status);
        if (entry) {
          const firstTwoDigits = Math.floor(entry.numericCode / 1000);
          expect(firstTwoDigits).toBe(entry.category);
        }
      }
    });
  });

  describe('category coverage', () => {
    it('should have NOT_FOUND codes starting with 10', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.ENTITY_NOT_FOUND);
      expect(Math.floor(entry!.numericCode / 1000)).toBe(10);
    });

    it('should have AUTHORIZATION codes starting with 20', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.FORBIDDEN_POLICY);
      expect(Math.floor(entry!.numericCode / 1000)).toBe(20);
    });

    it('should have VALIDATION codes starting with 30', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.BAD_USER_INPUT);
      expect(Math.floor(entry!.numericCode / 1000)).toBe(30);
    });

    it('should have OPERATIONS codes starting with 40', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.CALLOUT_CLOSED);
      expect(Math.floor(entry!.numericCode / 1000)).toBe(40);
    });

    it('should have SYSTEM codes starting with 50', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.BOOTSTRAP_FAILED);
      expect(Math.floor(entry!.numericCode / 1000)).toBe(50);
    });

    it('should have FALLBACK code 99999', () => {
      const entry = getErrorCodeEntry(AlkemioErrorStatus.UNSPECIFIED);
      expect(entry!.numericCode).toBe(99999);
    });
  });
});
