import { registerEnumType } from '@nestjs/graphql';

export enum LicensePrivilege {
  ACCESS_VIRTUAL_CONTRIBUTOR = 'access-virtual-contributor',
  CREATE_WHITEBOARD_RT = 'create-whiteboard-rt',
  CALLOUT_SAVE_AS_TEMPLATE = 'save-as-template',
}

registerEnumType(LicensePrivilege, {
  name: 'LicensePrivilege',
});
