import { registerEnumType } from '@nestjs/graphql';

export enum RoleSetInvitationResultType {
  ALREADY_INVITED_TO_ROLE_SET = 'already-invited-to-role-set',
  ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET = 'already-invited-to-platform-and-role-set',
  INVITED_TO_ROLE_SET = 'invited-to-role-set',
  INVITED_TO_PLATFORM_AND_ROLE_SET = 'invited-to-platform-and-role-set',
  INVITATION_TO_PARENT_NOT_AUTHORIZED = 'invitation-to-parent-not-authorized',
}

registerEnumType(RoleSetInvitationResultType, {
  name: 'RoleSetInvitationResultType',
});
