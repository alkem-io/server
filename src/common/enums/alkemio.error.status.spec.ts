import {
  computeNumericCode,
  getMetadataForStatus,
} from '@common/exceptions/error.status.metadata';
import { readFileSync } from 'fs';
import path from 'path';
import { AlkemioErrorStatus } from './alkemio.error.status';
import { ErrorCategory } from './error.category';

/**
 * The messaging-adapter unavailability status must read as infrastructure,
 * never as authorization, on every surface a consumer can observe: the enum
 * value, the numeric code family and the operator-facing reference document
 * have to agree.
 */
describe('AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE', () => {
  const status = AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE;
  const metadata = getMetadataForStatus(status);
  const numericCode = computeNumericCode(metadata);

  it('is a SYSTEM-category status, not an authorization one', () => {
    expect(status).toBe('COMMUNICATION_ADAPTER_UNAVAILABLE');
    expect(metadata.category).toBe(ErrorCategory.SYSTEM);
    expect(metadata.category).not.toBe(ErrorCategory.AUTHORIZATION);
    expect(metadata.category).not.toBe(ErrorCategory.NOT_FOUND);
  });

  it('carries a numeric code in the SYSTEM band', () => {
    expect(Math.floor(numericCode / 1000)).toBe(ErrorCategory.SYSTEM);
    expect(numericCode).toBe(14121);
  });

  it('is documented in docs/error-codes.md with the same numeric code', () => {
    const doc = readFileSync(
      path.resolve(__dirname, '../../../docs/error-codes.md'),
      'utf-8'
    );
    const row = doc
      .split('\n')
      .find(line => line.includes('COMMUNICATION_ADAPTER_UNAVAILABLE'));
    expect(row).toBeDefined();
    expect(row).toContain(`| ${numericCode} |`);
  });
});
