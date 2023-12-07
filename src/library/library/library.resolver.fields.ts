import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILibrary } from './library.interface';
import { UUID_NAMEID } from '@domain/common/scalars';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { LibraryService } from './library.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { InnovationPacksInput } from './dto/library.dto.innovationPacks.input';

@Resolver(() => ILibrary)
export class LibraryResolverFields {
  constructor(
    private innovationPackService: InnovationPackService,
    private libraryService: LibraryService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('innovationPack', () => IInnovationPack, {
    nullable: true,
    description: 'A single Innovation Pack',
  })
  @UseGuards(GraphqlGuard)
  async innovationPack(
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID_NAMEID,
      description: 'The ID or NAMEID of the Innovation Pack',
    })
    ID: string
  ): Promise<IInnovationPack> {
    return await this.innovationPackService.getInnovationPackOrFail(ID);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description: 'The StorageAggregator for storage used by this Library',
  })
  @UseGuards(GraphqlGuard)
  async storageAggregator(
    @Parent() library: ILibrary
  ): Promise<IStorageAggregator> {
    return await this.libraryService.getStorageAggregator(library);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('innovationPacks', () => [IInnovationPack], {
    nullable: false,
    description: 'The Innovation Packs in the platform Innovation Library.',
  })
  @UseGuards(GraphqlGuard)
  async innovationPacks(
    @Parent() library: ILibrary,
    @Args('queryData', { type: () => InnovationPacksInput, nullable: true })
    queryData?: InnovationPacksInput
  ): Promise<IInnovationPack[]> {
    return await this.libraryService.getInnovationPacks(
      library,
      queryData?.limit,
      queryData?.orderBy
    );
  }
}
