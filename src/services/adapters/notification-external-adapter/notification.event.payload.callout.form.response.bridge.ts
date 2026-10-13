import {
  ContributorPayload,
  NotificationEventPayloadSpace,
} from '@alkemio/notifications-lib';

/**
 * One payload for BOTH Form response events (the admin event and the
 * submitter receipt), declared verbatim in ONE bridge file on each side
 * (server here, the notifications service its own copy) so a mechanical
 * field-identity check is the contract, and publishing the lib later is a
 * pure type-only swap. `@alkemio/notifications-lib` stays pinned at its
 * published version.
 *
 * Link-only by construction: no answer, text, prompt or question field may
 * ever be added here.
 */
export interface NotificationEventPayloadSpaceCollaborationCalloutFormResponse
  extends NotificationEventPayloadSpace {
  callout: { id: string; displayName: string; url: string };
  formResponse: {
    id: string;
    submittedAt: string;
    visibility: 'ADMINS' | 'MEMBERS';
  };
  submitter: ContributorPayload;
}
