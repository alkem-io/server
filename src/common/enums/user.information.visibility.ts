import { registerEnumType } from '@nestjs/graphql';

export enum UserInformationVisibility {
  FOLLOW_SPACE_VISIBILITY = 'follow-space-visibility',
  MEMBERS_ONLY = 'members-only',
}

registerEnumType(UserInformationVisibility, {
  name: 'UserInformationVisibility',
  description:
    'Controls who may read member-user information in a Space. Follows space visibility by default, or restricts user info to members only.',
});
