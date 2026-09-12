import {
  BaseEventPayload,
  ContributorPayload,
} from '@alkemio/notifications-lib';

/**
 * Locally-declared wire payloads for the seven organization-associates
 * notification events. `@alkemio/notifications-lib` stays pinned at its
 * published version — these two interfaces are declared verbatim in ONE
 * bridge file on each side (server here, the notifications service its
 * own copy) so a mechanical field-identity check is the contract, and
 * publishing the lib later is a pure type-only swap.
 *
 * `NotificationEventPayloadOrganization` (the lib's own `organization:
 * ContributorPayload` + `BaseEventPayload` shape) is an internal-only type
 * in the published lib — not re-exported from its package root — so it is
 * inlined here rather than imported (061 precedent for the same gap).
 *
 * Event -> payload: the invitation event carries
 * NotificationEventPayloadOrganizationAssociateInvitation; the other six
 * (the two response events, the three application events, the joined
 * event) carry NotificationEventPayloadOrganizationAssociateActor.
 */
interface NotificationEventPayloadOrganization extends BaseEventPayload {
  organization: ContributorPayload;
}

export interface NotificationEventPayloadOrganizationAssociateInvitation
  extends NotificationEventPayloadOrganization {
  invitee: ContributorPayload;
  extraRoles: string[];
  welcomeMessage?: string;
  organizationUrl: string;
}

export interface NotificationEventPayloadOrganizationAssociateActor
  extends NotificationEventPayloadOrganization {
  actor: ContributorPayload;
  extraRoles: string[];
  extraRolesWithheld: string[];
  applicationMessage?: string;
  organizationAssociatesUrl: string;
  organizationUrl: string;
  // Present ONLY on the application-submitted event when the organization
  // has zero admins (support escalation), together with `recipients: []`.
  recipientEmail?: string;
}
