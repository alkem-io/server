import { registerEnumType } from '@nestjs/graphql';

export enum LicenseFeatureFlagName {
  WHITEBOARD_MULTI_USER = 'whiteboard-multi-user',
  CALLOUT_TO_CALLOUT_TEMPLATE = 'callout-to-callout-template',
  VIRTUAL_CONTRIBUTORS = 'virtual-contributors',
}

registerEnumType(LicenseFeatureFlagName, {
  name: 'LicenseFeatureFlagName',
});
