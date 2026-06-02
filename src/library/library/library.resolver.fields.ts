import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { PaginationArgs } from '@core/pagination';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorHasPrivilege } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LibraryInnovationPacksFilterInput } from './dto/library.dto.innovationPacks.filter';
import { InnovationPacksInput } from './dto/library.dto.innovationPacks.input';
import { PaginatedInnovationPacks } from './dto/library.dto.innovationPacks.paginated';
import { ITemplateResult } from './dto/library.dto.template.result';
import { LibraryTemplatesFilterInput } from './dto/library.dto.templates.input';
import { PaginatedLibraryTemplateResults } from './dto/library.dto.templates.paginated';
import { ILibrary } from './library.interface';
import { LibraryService } from './library.service';

@Resolver(() => ILibrary)
export class LibraryResolverFields {
  constructor(
    private libraryService: LibraryService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('innovationPacks', () => [IInnovationPack], {
    nullable: false,
    description: 'The Innovation Packs in the platform Innovation Library.',
  })
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templates', () => [ITemplateResult], {
    nullable: false,
    description:
      'The Templates in the Innovation Library, together with information about the InnovationPack.',
  })
  async templates(
    @Args('filter', {
      nullable: true,
      description: 'Only return Templates of particular TemplateTypes',
    })
    filter?: LibraryTemplatesFilterInput
  ): Promise<ITemplateResult[]> {
    return await this.libraryService.getTemplatesInListedInnovationPacks(
      filter
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('innovationPacksPaginated', () => PaginatedInnovationPacks, {
    nullable: false,
    description:
      'Paginated Innovation Packs in the platform Innovation Library (newest first).',
  })
  async innovationPacksPaginated(
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', {
      nullable: true,
      description:
        'Filter the Innovation Packs by a free-text term (title, description or tags).',
    })
    filter?: LibraryInnovationPacksFilterInput
  ): Promise<PaginatedInnovationPacks> {
    return this.libraryService.getPaginatedListedInnovationPacks(
      pagination,
      filter
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templatesPaginated', () => PaginatedLibraryTemplateResults, {
    nullable: false,
    description:
      'Paginated Templates in the Innovation Library, each with the InnovationPack that contributes it (newest first).',
  })
  async templatesPaginated(
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', {
      nullable: true,
      description: 'Only return Templates of particular TemplateTypes',
    })
    filter?: LibraryTemplatesFilterInput
  ): Promise<PaginatedLibraryTemplateResults> {
    return this.libraryService.getPaginatedTemplates(pagination, filter);
  }

  // TODO: these may want later to be on a Store entity
  @ResolveField(() => [IVirtualContributor], {
    nullable: false,
    description: 'The VirtualContributors listed on this platform',
  })
  async virtualContributors(): Promise<IVirtualContributor[]> {
    return await this.libraryService.getListedVirtualContributors();
  }

  @ResolveField(() => [IInnovationHub], {
    nullable: false,
    description: 'The InnovationHub listed on this platform',
  })
  async innovationHubs(): Promise<IInnovationHub[]> {
    return await this.libraryService.getListedInnovationHubs();
  }
}
