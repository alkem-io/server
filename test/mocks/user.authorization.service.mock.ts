import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockUserAuthorizationService: ValueProvider<
  PublicPart<UserAuthorizationService>
> = {
  provide: UserAuthorizationService,
  useValue: {
    grantCredentialsAllUsersReceive: jest.fn(),
    applyAuthorizationPolicy: jest.fn(),
  },
};
