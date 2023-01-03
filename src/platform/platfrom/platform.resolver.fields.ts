import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ILibrary } from '@library/library/library.interface';
import { LibraryService } from '@library/library/library.service';
import { ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IPlatform } from './platform.interface';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private libraryService: LibraryService
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
    const result = await this.libraryService.getLibraryOrFail();
    return result;
  }
}
