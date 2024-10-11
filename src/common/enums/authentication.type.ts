import { registerEnumType } from '@nestjs/graphql';

export enum AuthenticationType {
  LINKEDIN = 'linkedin',
  MICROSOFT = 'microsoft',
  EMAIL = 'email',
  UNKNOWN = 'unknown',
}

registerEnumType(AuthenticationType, {
  name: 'AuthenticationType',
});
