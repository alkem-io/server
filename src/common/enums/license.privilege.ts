import { registerEnumType } from '@nestjs/graphql';

export enum LicensePrivilege {
  VIRTUAL_CONTRIBUTOR_ACCESS = 'virtual-contributor-access',
  WHITEBOARD_MULTI_USER = 'whiteboard-multi-user',
  CALLOUT_SAVE_AS_TEMPLATE = 'callout-save-as-template',
}

registerEnumType(LicensePrivilege, {
  name: 'LicensePrivilege',
});
