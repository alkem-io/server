import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseException } from './base.exception';

/**
 * 027-platform-role-redesign (FR-027): thrown when an OPERATOR-INITIATED role
 * assignment's audit write fails. Role assignment fails closed — the record
 * IS the control, so the grant/revoke MUST NOT take effect if it cannot be
 * recorded. Never thrown for a bootstrap-seeded write, which fails open by
 * design (the break-glass must not depend on a healthy audit store).
 */
export class PlatformRoleAssignmentAuditException extends BaseException {
  constructor(message: string, details?: ExceptionDetails) {
    super(
      message,
      LogContext.PLATFORM,
      AlkemioErrorStatus.PLATFORM_ROLE_ASSIGNMENT_AUDIT_FAILED,
      details
    );
  }
}
