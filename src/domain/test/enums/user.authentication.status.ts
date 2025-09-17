import { registerEnumType } from '@nestjs/graphql';

export enum UserAuthenticationStatus {
  ANONYMOUS = 'anonymous',
  GUEST = 'guest',
  AUTHENTICATED = 'authenticated',
}

registerEnumType(UserAuthenticationStatus, {
  name: 'UserAuthenticationStatus',
  description: 'The authentication status of the current user',
});
