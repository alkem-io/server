import { registerEnumType } from '@nestjs/graphql';

export enum LicenseEntitlementDataType {
  LIMIT = 'limit',
  FLAG = 'flag',
}

registerEnumType(LicenseEntitlementDataType, {
  name: 'LicenseEntitlementDataType',
});
