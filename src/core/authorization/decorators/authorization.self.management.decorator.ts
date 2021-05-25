import { SetMetadata } from '@nestjs/common';

export const AuthorizationSelfRegistration = () =>
  SetMetadata('self-registration', true);
