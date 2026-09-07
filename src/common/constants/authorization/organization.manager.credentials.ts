import { AuthorizationCredential } from '@common/enums/authorization.credential';

// The credential types that make a user a manager of an organization —
// able to act on its behalf (accept/decline invitations, edit settings)
// regardless of whether they also hold associate membership. Shared by
// every lookup that needs "who manages this organization" rather than
// "who is a member of this organization".
export const ORGANIZATION_MANAGER_CREDENTIAL_TYPES: readonly AuthorizationCredential[] =
  [
    AuthorizationCredential.ORGANIZATION_OWNER,
    AuthorizationCredential.ORGANIZATION_ADMIN,
  ];

// The credential types that receive an organization's notifications.
// Deliberately NARROWER than ORGANIZATION_MANAGER_CREDENTIAL_TYPES above:
// product asked for "all organization admins" only (server#4100 AC,
// notifications#356 AC and the product email thread all say admins, never
// owners), so an owner who is not also an admin manages the organization and
// may accept on its behalf, but is not notified.
export const ORGANIZATION_NOTIFICATION_CREDENTIAL_TYPES: readonly AuthorizationCredential[] =
  [AuthorizationCredential.ORGANIZATION_ADMIN];
