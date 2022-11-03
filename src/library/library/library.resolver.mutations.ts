import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LibraryService } from './library.service';
import { ILibrary } from './library.interface';
import { LibraryAuthorizationService } from './library.service.authorization';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { CreateInnovationPackOnLibraryInput } from './dto/library.dto.create.innovation.pack';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';

@Resolver()
export class LibraryResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private libraryService: LibraryService,
    private libraryAuthorizationService: LibraryAuthorizationService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationPack, {
    description: 'Create a new InnovatonPack on the Library.',
  })
  @Profiling.api
  async createInnovationPackOnLibrary(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('packData') packData: CreateInnovationPackOnLibraryInput
  ): Promise<IInnovationPack> {
    const library = await this.libraryService.getLibraryOrFail();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      library.authorization,
      AuthorizationPrivilege.CREATE,
      `create innovationPack on library: ${library.id}`
    );

    const innovationPack = await this.libraryService.createInnovationPack(
      packData
    );
    const innovationPackAuthorized =
      await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
        innovationPack,
        library.authorization
      );
    return innovationPackAuthorized;
  }
}
