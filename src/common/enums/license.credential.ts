import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum LicenseCredential {
  SPACE_LICENSE_FREE = 'space-license-free',
  SPACE_LICENSE_PLUS = 'space-license-plus',
  SPACE_LICENSE_PREMIUM = 'space-license-premium',
  SPACE_LICENSE_ENTERPRISE = 'space-license-enterprise', // todo: remove for space
  SPACE_FEATURE_SAVE_AS_TEMPLATE = 'space-feature-save-as-template',
  SPACE_FEATURE_VIRTUAL_CONTRIBUTORS = 'space-feature-virtual-contributors',
  SPACE_FEATURE_WHITEBOARD_MULTI_USER = 'space-feature-whiteboard-multi-user',
  ACCOUNT_LICENSE_PLUS = 'account-license-plus',
}

registerEnumType(LicenseCredential, {
  name: 'LicenseCredential',
});
