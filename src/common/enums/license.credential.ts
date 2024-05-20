import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum LicenseCredential {
  SPACE_FREE = 'space-free',
  SPACE_PLUS = 'space-plus',
}

registerEnumType(LicenseCredential, {
  name: 'LicenseCredential',
});
