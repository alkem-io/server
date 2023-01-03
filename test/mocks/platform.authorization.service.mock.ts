import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';

export const MockPlatformAuthorizationService: ValueProvider<
  PublicPart<PlatformAuthorizationPolicyService>
> = {
  provide: PlatformAuthorizationPolicyService,
  useValue: {},
};
