import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum LicenseCredential {
  SPACE_FREE = 'space-free',
  SPACE_PLUS = 'space-plus',
  SPACE_PREMIUM = 'space-premium',
  SPACE_ENTERPRISE = 'space-enterprise',
}

registerEnumType(LicenseCredential, {
  name: 'LicenseCredential',
});
