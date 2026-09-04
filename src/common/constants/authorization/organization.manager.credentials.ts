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
