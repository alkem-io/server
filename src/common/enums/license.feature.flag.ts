import { registerEnumType } from '@nestjs/graphql';

export enum LicenseFeatureFlag {
  WHITEBOART_RT = 'whiteboard-rt',
  CALLOUT_TO_CALLOUT_TEMPLATE = 'callout-to-callout-template',
}

registerEnumType(LicenseFeatureFlag, {
  name: 'LicenseFeatureFlag',
});
