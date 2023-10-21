import { registerEnumType } from '@nestjs/graphql';

export enum LicenseFeatureFlag {
  WHTIEBOART_RT = 'open',
}

registerEnumType(LicenseFeatureFlag, {
  name: 'LicenseFeatureFlag',
});
