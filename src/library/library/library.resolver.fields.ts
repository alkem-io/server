import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILibrary } from './library.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';

@Resolver(() => ILibrary)
export class LibraryResolverFields {
  constructor(private innovationPackService: InnovationPackService) {}

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
      type: () => UUID,
      description: 'The ID of the Innovation Pack',
    })
    ID: string
  ): Promise<IInnovationPack> {
    return await this.innovationPackService.getInnovationPackOrFail(ID);
  }
}
