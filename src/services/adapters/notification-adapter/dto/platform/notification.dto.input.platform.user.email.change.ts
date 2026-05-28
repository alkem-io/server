import {
  SubjectMembershipsPayload,
  UserEmailChangeTriggerOutcome,
  UserProfileSummaryPayload,
} from '@domain/community/user-email-change/dto/notification.payloads';
import { UserEmailChangeInitiatorRole } from '@domain/community/user-email-change/enums/user.email.change.initiator.role';
import { EmailChangeApprover } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputUserEmailChangeGlobalAdmin
  extends NotificationInputBase {
  // The subject of the change — excluded from the admin fan-out (FR-009).
  subjectUserID: string;
  subjectProfileSummary: UserProfileSummaryPayload;
  oldEmail: string;
  newEmail: string;
  initiatorProfileSummary?: UserProfileSummaryPayload;
  initiatorRole: UserEmailChangeInitiatorRole;
  // Organizational authorizer of the change (platform-admin flow only).
  approver?: EmailChangeApprover;
  // Admin-supplied justification for the change (platform-admin flow only).
  reason?: string;
  commitTimestampISO8601: string;
  triggerOutcome: UserEmailChangeTriggerOutcome;
  subjectMemberships: SubjectMembershipsPayload;
  subjectGlobalRoles: string[];
}
