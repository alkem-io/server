import { registerEnumType } from '@nestjs/graphql';
import { HubPreferenceType } from './hub.preference.type';
import { UserPreferenceType } from './user.preference.type';

export const PreferenceType = {
  ...UserPreferenceType,
  ...HubPreferenceType,
};

export type PreferenceType = UserPreferenceType | HubPreferenceType;

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
