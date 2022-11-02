import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LibraryService } from './library.service';
import { ILibrary } from './library.interface';
import { LibraryAuthorizationService } from './library.service.authorization';

@Resolver()
export class LibraryResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private libraryService: LibraryService,
    private libraryAuthorizationService: LibraryAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILibrary, {
    description: 'Reset the Authorization Policy on the specified Library.',
  })
  @Profiling.api
  async authorizationPolicyResetOnLibrary(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<ILibrary> {
    const library = await this.libraryService.getLibraryOrFail();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      library.authorization,
      AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization on library: ${agentInfo.email}`
    );
    return await this.libraryAuthorizationService.applyAuthorizationPolicy(
      library
    );
  }
}
