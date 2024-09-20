import { registerEnumType } from '@nestjs/graphql';

export enum LicensePlanType {
  ACCOUNT_FEATURE_FLAG = 'account-feature-flag',
  ACCOUNT_PLAN = 'account-plan',
  SPACE_PLAN = 'space-plan',
  SPACE_FEATURE_FLAG = 'space-feature-flag',
}

registerEnumType(LicensePlanType, {
  name: 'LicensePlanType',
});
