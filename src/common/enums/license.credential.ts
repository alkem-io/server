import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum LicenseCredential {
  LICENSE_SPACE_FREE = 'license-space-free',
  LICENSE_SPACE_PLUS = 'license-space-plus',
  LICENSE_SPACE_PREMIUM = 'license-space-premium',
  LICENSE_SPACE_ENTERPRISE = 'license-space-enterprise',
  FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE = 'feature-callout-to-callout-template',
  FEATURE_VIRTUAL_CONTRIBUTORS = 'feature-virtual-contributors',
  FEATURE_WHITEBOARD_MULTI_USER = 'feature-whiteboard-multi-user',
}

registerEnumType(LicenseCredential, {
  name: 'LicenseCredential',
});
