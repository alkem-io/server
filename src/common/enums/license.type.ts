import { registerEnumType } from '@nestjs/graphql';

export enum LicenseType {
  ACCOUNT = 'account',
  SPACE = 'space',
  WHITEBOARD = 'whiteboard',
  ROLESET = 'roleset',
  COLLABORATION = 'collaboration',
  TEMPLATE_CONTENT_SPACE = 'template_content_space',
}

registerEnumType(LicenseType, {
  name: 'LicenseType',
});
