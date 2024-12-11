import { registerEnumType } from '@nestjs/graphql';

export enum LicensingCredentialBasedPlanType {
  ACCOUNT_FEATURE_FLAG = 'account-feature-flag',
  ACCOUNT_PLAN = 'account-plan',
  SPACE_PLAN = 'space-plan',
  SPACE_FEATURE_FLAG = 'space-feature-flag',
}

registerEnumType(LicensingCredentialBasedPlanType, {
  name: 'LicensingCredentialBasedPlanType',
});
