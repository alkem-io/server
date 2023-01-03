import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { ILibrary } from '@library/library/library.interface';
import { ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private platformService: PlatformService
  ) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: false,
    description: 'The authorization policy for the platform',
  })
  authorization(): IAuthorizationPolicy {
    return this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
  }

  @ResolveField('library', () => ILibrary, {
    nullable: false,
    description: 'The Innovation Library for the platform',
  })
  async library(): Promise<ILibrary> {
    const result = await this.platformService.getLibraryOrFail();
    return result;
  }

  @ResolveField('communication', () => ICommunication, {
    nullable: false,
    description: 'The Communications for the platform',
  })
  async communication(): Promise<ICommunication> {
    const result = await this.platformService.getCommunicationOrFail();
    return result;
  }
}
