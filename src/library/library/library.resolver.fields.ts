import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILibrary } from './library.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { LibraryService } from './library.service';
import { InnovationPacksInput } from './dto/library.dto.innovationPacks.input';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver(() => ILibrary)
export class LibraryResolverFields {
  constructor(
    private libraryService: LibraryService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('innovationPacks', () => [IInnovationPack], {
    nullable: false,
    description: 'The Innovation Packs in the platform Innovation Library.',
  })
  @UseGuards(GraphqlGuard)
  async innovationPacks(
    @Args('queryData', { type: () => InnovationPacksInput, nullable: true })
    queryData?: InnovationPacksInput
  ): Promise<IInnovationPack[]> {
    this.logger.verbose?.(
      `Ignoring query data ${JSON.stringify(queryData)} for now; to be added back in later`,
      LogContext.LIBRARY
    );
    return await this.libraryService.getListedInnovationPacks(
      queryData?.limit,
      queryData?.orderBy
    );
  }

  // TODO: these may want later to be on a Store entity
  @UseGuards(GraphqlGuard)
  @ResolveField(() => [IVirtualContributor], {
    nullable: false,
    description: 'The VirtualContributors listed on this platform',
  })
  async virtualContributors(): Promise<IVirtualContributor[]> {
    return await this.libraryService.getListedVirtualContributors();
  }
}
