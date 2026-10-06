import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFormResponseVisibility {
  ADMINS = 'admins',
  MEMBERS = 'members',
}

registerEnumType(CalloutFormResponseVisibility, {
  name: 'CalloutFormResponseVisibility',
  description:
    'Who can read all responses of a Form. ADMINS: only the space admins. MEMBERS: the members of the space as well.',
});
