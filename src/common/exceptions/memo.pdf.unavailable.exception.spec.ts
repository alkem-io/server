import { AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';
import { MemoPdfUnavailableException } from './memo.pdf.unavailable.exception';
import { ValidationException } from './validation.exception';

describe('MemoPdfUnavailableException', () => {
  it('carries the retryable SYSTEM code and the reason', () => {
    const error = new MemoPdfUnavailableException('busy-actor');

    expect(error).toBeInstanceOf(BaseException);
    expect(error).not.toBeInstanceOf(ValidationException);
    expect(error.code).toBe(AlkemioErrorStatus.MEMO_PDF_UNAVAILABLE);
    expect(error.extensions.numericCode).toBe(14122);
    expect(error.extensions.userMessage).toBe(
      'userMessages.system.memoPdfUnavailable'
    );
    expect(error.details).toEqual({ reason: 'busy-actor' });
    expect(error.reason).toBe('busy-actor');
    expect(error.message).toBe(
      'Memo PDF rendering is unavailable (busy-actor)'
    );
  });

  it('carries a retry hint only when one is given', () => {
    expect(
      new MemoPdfUnavailableException('busy-global').retryAfterSeconds
    ).toBeUndefined();
    const limited = new MemoPdfUnavailableException('rate-limited', {
      retryAfterSeconds: 42,
    });
    expect(limited.retryAfterSeconds).toBe(42);
    expect(limited.details).toEqual({ reason: 'rate-limited' });
  });
});
