import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockAuthorizationPolicyService: ValueProvider<
  PublicPart<AuthorizationPolicyService>
> = {
  provide: AuthorizationPolicyService,
  useValue: {
    getPlatformAuthorizationPolicy: jest.fn(),
  },
};
