import { registerEnumType } from '@nestjs/graphql';

export enum AuthenticationType {
  LINKEDIN = 'linkedin',
  MICROSOFT = 'microsoft',
  GITHUB = 'github',
  CLEVERBASE = 'cleverbase',
  EMAIL = 'email',
  UNKNOWN = 'unknown',
}

registerEnumType(AuthenticationType, {
  name: 'AuthenticationType',
});
