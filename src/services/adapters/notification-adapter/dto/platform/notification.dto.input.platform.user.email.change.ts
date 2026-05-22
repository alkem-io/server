import {
  SubjectMembershipsPayload,
  UserEmailChangeTriggerOutcome,
  UserProfileSummaryPayload,
} from '@domain/community/user-email-change/dto/notification.payloads';
import { UserEmailChangeInitiatorRole } from '@domain/community/user-email-change/enums/user.email.change.initiator.role';
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
  commitTimestampISO8601: string;
  triggerOutcome: UserEmailChangeTriggerOutcome;
  subjectMemberships: SubjectMembershipsPayload;
  subjectGlobalRoles: string[];
}
