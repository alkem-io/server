import { registerEnumType } from '@nestjs/graphql';

export enum LicenseFeatureFlag {
  WHTIEBOART_RT = 'whiteboard-rt',
}

registerEnumType(LicenseFeatureFlag, {
  name: 'LicenseFeatureFlag',
});
