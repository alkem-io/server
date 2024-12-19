import { registerEnumType } from '@nestjs/graphql';
import { UserPreferenceType } from './user.preference.type';

export const PreferenceType = {
  ...UserPreferenceType,
};

export type PreferenceType = UserPreferenceType;

registerEnumType(PreferenceType, {
  name: 'PreferenceType',
});
