import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { InnovationPackService } from './innovation.pack.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationPack } from './innovation.pack.interface';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class InnovationPackResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationPackService: InnovationPackService
  ) {}

  @Mutation(() => IInnovationPack, {
    description: 'Updates the InnovationPack.',
  })
  @Profiling.api
  async updateInnovationPack(
    @CurrentUser() actorContext: ActorContext,
    @Args('innovationPackData') innovationPackData: UpdateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(
        innovationPackData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationPack.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationPack: ${innovationPack.id}`
    );

    // ensure working with UUID
    innovationPackData.ID = innovationPack.id;

    return await this.innovationPackService.update(innovationPackData);
  }

  @Mutation(() => IInnovationPack, {
    description: 'Deletes the specified InnovationPack.',
  })
  async deleteInnovationPack(
    @CurrentUser() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationPack.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteInnovationPack: ${innovationPack.id}`
    );
    return await this.innovationPackService.deleteInnovationPack(deleteData);
  }
}
