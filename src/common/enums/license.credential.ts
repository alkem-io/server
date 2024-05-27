import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum LicenseCredential {
  LICENSE_SPACE_FREE = 'license-space-free',
  LICENSE_SPACE_PLUS = 'license-space-plus',
  LICENSE_SPACE_PREMIUM = 'license-space-premium',
  LICENSE_SPACE_ENTERPRISE = 'license-space-enterprise',
}

registerEnumType(LicenseCredential, {
  name: 'LicenseCredential',
});
