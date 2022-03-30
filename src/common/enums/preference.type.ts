import { registerEnumType } from '@nestjs/graphql';
import { HubPreferenceType } from './hub.preference.type';
import { UserPreferenceType } from './user.preference.type';
import { ChallengePreferenceType } from '@common/enums/challenge.preference.type';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';

export const PreferenceType = {
  ...UserPreferenceType,
  ...HubPreferenceType,
  ...ChallengePreferenceType,
  ...OrganizationPreferenceType,
};

export type PreferenceType =
  | UserPreferenceType
  | HubPreferenceType
  | ChallengePreferenceType
  | OrganizationPreferenceType;

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
