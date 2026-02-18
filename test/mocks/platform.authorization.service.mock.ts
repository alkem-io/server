import { ValueProvider } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { PublicPart } from '@test/utils';

export const MockPlatformAuthorizationService: ValueProvider<
  PublicPart<PlatformAuthorizationPolicyService>
> = {
  provide: PlatformAuthorizationPolicyService,
  useValue: {},
};
