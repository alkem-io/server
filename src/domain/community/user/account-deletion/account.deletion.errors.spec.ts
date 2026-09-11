import { PRIVILEGED_SESSION_WINDOW_MS } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  AccountDeletionBlockedException,
  SessionRefreshRequiredException,
} from '@common/exceptions';
import { describe, expect, it } from 'vitest';

describe('account-deletion error surface', () => {
  it('PRIVILEGED_SESSION_WINDOW_MS is exactly 15 minutes', () => {
    expect(PRIVILEGED_SESSION_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it('SessionRefreshRequiredException carries the distinct extensions.code', () => {
    const error = new SessionRefreshRequiredException(
      'session too old',
      LogContext.COMMUNITY
    );
    expect(error.extensions.code).toBe('SESSION_REFRESH_REQUIRED');
  });

  it('AccountDeletionBlockedException carries the distinct extensions.code', () => {
    const error = new AccountDeletionBlockedException(
      'account holds resources',
      LogContext.COMMUNITY
    );
    expect(error.extensions.code).toBe('ACCOUNT_DELETION_BLOCKED');
  });
});
