import { registerEnumType } from '@nestjs/graphql';

// Optional, informational addendum to a RoleSetInvitationResult that
// stayed a success (e.g. INVITED_TO_ROLE_SET) but has something the
// caller should know without treating the invite as failed.
export enum RoleSetInvitationResultNotice {
  ORGANIZATION_HAS_NO_ADMINISTRATORS = 'organization-has-no-administrators',
}

registerEnumType(RoleSetInvitationResultNotice, {
  name: 'RoleSetInvitationResultNotice',
});
