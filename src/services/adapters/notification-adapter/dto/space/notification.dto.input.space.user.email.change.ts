import {
  UserEmailChangeTriggerOutcome,
  UserProfileSummaryPayload,
} from '@domain/community/user-email-change/dto/notification.payloads';
import { UserEmailChangeInitiatorRole } from '@domain/community/user-email-change/enums/user.email.change.initiator.role';
import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * Input for the per-space email-change fan-out. The orchestration service
 * builds this once and the space adapter publishes one event per space the
 * subject is a member of.
 */
export interface NotificationInputUserEmailChangeSpaceAdmin
  extends NotificationInputBase {
  // The subject of the change — excluded from the per-space fan-out (FR-004).
  subjectUserID: string;
  subjectProfileSummary: UserProfileSummaryPayload;
  oldEmail: string;
  newEmail: string;
  initiatorProfileSummary?: UserProfileSummaryPayload;
  initiatorRole: UserEmailChangeInitiatorRole;
  commitTimestampISO8601: string;
  triggerOutcome: UserEmailChangeTriggerOutcome;
}
