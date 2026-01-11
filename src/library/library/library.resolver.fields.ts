import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege } from '@src/common/decorators';
import { ILibrary } from './library.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { LibraryService } from './library.service';
import { InnovationPacksInput } from './dto/library.dto.innovationPacks.input';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplateResult } from './dto/library.dto.template.result';
import { LibraryTemplatesFilterInput } from './dto/library.dto.templates.input';

@Resolver(() => ILibrary)
export class LibraryResolverFields {
  constructor(
    private libraryService: LibraryService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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
