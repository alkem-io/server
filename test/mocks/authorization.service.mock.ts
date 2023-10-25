import { AuthorizationService } from '@core/authorization/authorization.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockAuthorizationService: ValueProvider<
  PublicPart<AuthorizationService>
> = {
  provide: AuthorizationService,
  useValue: {
    grantAccessOrFail: jest.fn(),
    isAccessGranted: jest.fn(),
  },
};
