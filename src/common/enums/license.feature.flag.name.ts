import { registerEnumType } from '@nestjs/graphql';

export enum LicenseFeatureFlagName {
  WHITEBOART_RT = 'whiteboard-rt',
  CALLOUT_TO_CALLOUT_TEMPLATE = 'callout-to-callout-template',
}

registerEnumType(LicenseFeatureFlagName, {
  name: 'LicenseFeatureFlagName',
});
