import { registerEnumType } from '@nestjs/graphql';

export enum LicenseEntitlementType {
  SPACE = 'space',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  INNOVATION_PACK = 'innovation-pack',
  INNOVATION_HUB = 'innovation-hub',
}

registerEnumType(LicenseEntitlementType, {
  name: 'LicenseEntitlementType',
});
