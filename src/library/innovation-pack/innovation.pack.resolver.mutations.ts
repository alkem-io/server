import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';

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
    @CurrentActor() actorContext: ActorContext,
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
    @CurrentActor() actorContext: ActorContext,
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
