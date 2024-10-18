import { registerEnumType } from '@nestjs/graphql';

export enum LicenseEntitlementType {
  ACCOUNT_SPACE = 'account-space',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'account-virtual-contributor',
  ACCOUNT_INNOVATION_PACK = 'account-innovation-pack',
  ACCOUNT_INNOVATION_HUB = 'account-innovation-hub',
  SPACE_FLAG_SAVE_AS_TEMPLATE = 'space-flag-save-as-template',
  SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS = 'space-flag-virtual-contributor-access',
  SPACE_FLAG_WHITEBOARD_MULTI_USER = 'space-flag-whiteboard-multi-user',
}

registerEnumType(LicenseEntitlementType, {
  name: 'LicenseEntitlementType',
});
