import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILibrary } from './library.interface';
import { UUID_NAMEID } from '@domain/common/scalars';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IStorageBucket } from '@domain/storage/storage-space/storage.space.interface';
import { LibraryService } from './library.service';

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
  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: true,
    description: 'The StorageBucket with documents in use by this User',
  })
  @UseGuards(GraphqlGuard)
  async storageBucket(@Parent() library: ILibrary): Promise<IStorageBucket> {
    return await this.libraryService.getStorageBucket(library);
  }
}
