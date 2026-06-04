import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { LicenseEntitlementUnevaluableException } from './license.entitlement.unevaluable.exception';

describe('LicenseEntitlementUnevaluableException', () => {
  const FR_007_MESSAGE = 'Office Docs is not enabled for this Collaboration.';

  it('uses LICENSE_ENTITLEMENT_UNEVALUABLE as the default error code', () => {
    const exception = new LicenseEntitlementUnevaluableException(
      FR_007_MESSAGE,
      LogContext.LICENSE
    );

    expect(exception.extensions?.code).toBe(
      AlkemioErrorStatus.LICENSE_ENTITLEMENT_UNEVALUABLE
    );
  });

  it('preserves the FR-007 user-facing message immutably', () => {
    const exception = new LicenseEntitlementUnevaluableException(
      FR_007_MESSAGE,
      LogContext.LICENSE
    );

    expect(exception.message).toBe(FR_007_MESSAGE);
  });

  it('exposes details payload when provided (FR-010 structured context)', () => {
    const collaborationId = 'collab-uuid-1234';
    const exception = new LicenseEntitlementUnevaluableException(
      FR_007_MESSAGE,
      LogContext.LICENSE,
      { collaborationId }
    );

    expect(exception.extensions?.details).toEqual({ collaborationId });
  });

  it('does not leak the collaborationId into the message body', () => {
    const collaborationId = 'collab-uuid-secret';
    const exception = new LicenseEntitlementUnevaluableException(
      FR_007_MESSAGE,
      LogContext.LICENSE,
      { collaborationId }
    );

    expect(exception.message).not.toContain(collaborationId);
  });

  it('allows an explicit error code override', () => {
    const exception = new LicenseEntitlementUnevaluableException(
      FR_007_MESSAGE,
      LogContext.LICENSE,
      undefined,
      AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE
    );

    expect(exception.extensions?.code).toBe(
      AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE
    );
  });
});
