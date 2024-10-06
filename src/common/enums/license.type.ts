import { registerEnumType } from '@nestjs/graphql';

export enum LicenseType {
  ACCOUNT = 'account',
  WHITEBOARD = 'whiteboard',
  ROLESET = 'roleset',
  COLLABORATION = 'collaboration',
}

registerEnumType(LicenseType, {
  name: 'LicenseType',
});
