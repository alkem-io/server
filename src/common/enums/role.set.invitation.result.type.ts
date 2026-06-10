import { registerEnumType } from '@nestjs/graphql';

export enum RoleSetInvitationResultType {
  ALREADY_INVITED_TO_ROLE_SET = 'already-invited-to-role-set',
  ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET = 'already-invited-to-platform-and-role-set',
  INVITED_TO_ROLE_SET = 'invited-to-role-set',
  INVITED_TO_PLATFORM_AND_ROLE_SET = 'invited-to-platform-and-role-set',
  INVITATION_TO_PARENT_NOT_AUTHORIZED = 'invitation-to-parent-not-authorized',
  ALREADY_HAS_OPEN_APPLICATION = 'already-has-open-application',
  ALREADY_MEMBER_OF_ROLE_SET = 'already-member-of-role-set',
}

registerEnumType(RoleSetInvitationResultType, {
  name: 'RoleSetInvitationResultType',
});
