import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LibraryService } from './library.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { CreateInnovationPackOnLibraryInput } from './dto/library.dto.create.innovation.pack';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';

@Resolver()
export class LibraryResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private libraryService: LibraryService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService
  ) {}

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
