import { registerEnumType } from '@nestjs/graphql';

export enum LicensePrivilege {
  SPACE_VIRTUAL_CONTRIBUTOR_ACCESS = 'space-virtual-contributor-access',
  SPACE_WHITEBOARD_MULTI_USER = 'space-whiteboard-multi-user',
  SPACE_SAVE_AS_TEMPLATE = 'space-save-as-template',

  ACCOUNT_CREATE_SPACE = 'account-create-space',
  ACCOUNT_CREATE_VIRTUAL_CONTRIBUTOR = 'account-create-virtual-contributor',
  ACCOUNT_CREATE_INNOVATION_PACK = 'account-create-innovation-pack',
  ACCOUNT_CREATE_INNOVATION_HUB = 'account-create-innovation-hub',
}

registerEnumType(LicensePrivilege, {
  name: 'LicensePrivilege',
});
