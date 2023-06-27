import { registerEnumType } from '@nestjs/graphql';
import { SpacePreferenceType } from './space.preference.type';
import { UserPreferenceType } from './user.preference.type';
import { ChallengePreferenceType } from '@common/enums/challenge.preference.type';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';

export const PreferenceType = {
  ...UserPreferenceType,
  ...SpacePreferenceType,
  ...ChallengePreferenceType,
  ...OrganizationPreferenceType,
};

export type PreferenceType =
  | UserPreferenceType
  | SpacePreferenceType
  | ChallengePreferenceType
  | OrganizationPreferenceType;

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
