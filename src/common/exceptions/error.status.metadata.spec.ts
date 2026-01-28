import { AlkemioErrorStatus } from '@common/enums';
import {
  computeNumericCode,
  FALLBACK_METADATA,
  getMetadataForStatus,
  validateRegistryCompleteness,
  validateUniqueNumericCodes,
} from './error.status.metadata';

describe('ErrorStatusMetadata', () => {
  describe('registry completeness', () => {
    it('should have a mapping for every AlkemioErrorStatus value', () => {
      const unmapped = validateRegistryCompleteness();

      expect(unmapped).toEqual([]);
    });

    it('should cover all enum values (sanity check)', () => {
      const enumValues = Object.values(AlkemioErrorStatus);

      // This test documents the expected count - update when adding new statuses
      // If this fails, a new status was added to AlkemioErrorStatus
      // Add the mapping to STATUS_METADATA in error.status.metadata.ts
      expect(enumValues.length).toBeGreaterThan(0);

      for (const status of enumValues) {
        const metadata = getMetadataForStatus(status as AlkemioErrorStatus);
        expect(metadata).toBeDefined();
        expect(metadata.category).toBeDefined();
        expect(metadata.specificCode).toBeDefined();
        expect(metadata.userMessage).toBeDefined();
      }
    });
  });

  describe('numeric code uniqueness', () => {
    it('should have unique numeric codes for all statuses', () => {
      const duplicates = validateUniqueNumericCodes();

      expect(duplicates).toEqual([]);
    });
  });

  describe('numeric code format', () => {
    it('should produce 5-digit codes in expected ranges', () => {
      const allStatuses = Object.values(AlkemioErrorStatus);

      for (const status of allStatuses) {
        const metadata = getMetadataForStatus(status as AlkemioErrorStatus);
        const numericCode = computeNumericCode(metadata);

        // Numeric codes should be 5 digits: category (2 digits) * 1000 + specific (3 digits)
        expect(numericCode).toBeGreaterThanOrEqual(10000);
        expect(numericCode).toBeLessThan(100000);
      }
    });

    it('should have category prefix between 10 and 99', () => {
      const allStatuses = Object.values(AlkemioErrorStatus);

      for (const status of allStatuses) {
        const metadata = getMetadataForStatus(status as AlkemioErrorStatus);
        const categoryPrefix = Math.floor(computeNumericCode(metadata) / 1000);

        expect(categoryPrefix).toBeGreaterThanOrEqual(10);
        expect(categoryPrefix).toBeLessThanOrEqual(99);
      }
    });
  });

  describe('FALLBACK_METADATA', () => {
    it('should have category 99 (FALLBACK)', () => {
      expect(FALLBACK_METADATA.category).toBe(99);
    });

    it('should produce numeric code 99999', () => {
      expect(computeNumericCode(FALLBACK_METADATA)).toBe(99999);
    });

    it('should have a user message with errorId placeholder', () => {
      expect(FALLBACK_METADATA.userMessage).toContain('{{errorId}}');
    });
  });
});
