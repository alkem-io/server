import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { PlatformAuthorizationService } from '@src/platform/authorization/platform.authorization.service';

export const MockPlatformAuthorizationService: ValueProvider<
  PublicPart<PlatformAuthorizationService>
> = {
  provide: PlatformAuthorizationService,
  useValue: {},
};
