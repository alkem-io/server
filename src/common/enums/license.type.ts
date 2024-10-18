import { registerEnumType } from '@nestjs/graphql';

export enum LicenseType {
  ACCOUNT = 'account',
  SPACE = 'space',
  WHITEBOARD = 'whiteboard',
  ROLESET = 'roleset',
  COLLABORATION = 'collaboration',
}

registerEnumType(LicenseType, {
  name: 'LicenseType',
});
