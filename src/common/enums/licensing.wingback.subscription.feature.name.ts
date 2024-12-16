import { registerEnumType } from '@nestjs/graphql';

export enum LicensingWingbackSubscriptionFeatureName {
  ACCOUNT_SPACE_FREE = 'account-space-free',
  ACCOUNT_SPACE_PLUS = 'account-space-plus',
  ACCOUNT_SPACE_PREMIUM = 'account-space-premium',
}

registerEnumType(LicensingWingbackSubscriptionFeatureName, {
  name: 'LicensingWingbackSubscriptionFeatureName',
});
