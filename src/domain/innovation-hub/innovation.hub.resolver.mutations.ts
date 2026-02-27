import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { DeleteInnovationHubInput } from './dto/innovation.hub.dto.delete';
import { UpdateInnovationHubInput } from './dto/innovation.hub.dto.update';
import { IInnovationHub } from './innovation.hub.interface';
import { InnovationHubService } from './innovation.hub.service';

@InstrumentResolver()
@Resolver()
export class InnovationHubResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService
  ) {}

  @Mutation(() => IInnovationHub, {
    description: 'Update Innovation Hub.',
  })
  @Profiling.api
  async updateInnovationHub(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(updateData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationHub.authorization,
      AuthorizationPrivilege.UPDATE,
      'update innovation hub'
    );

    return await this.innovationHubService.updateOrFail(updateData);
  }

  @Mutation(() => IInnovationHub, {
    description: 'Delete Innovation Hub.',
  })
  @Profiling.api
  async deleteInnovationHub(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationHub.authorization,
      AuthorizationPrivilege.DELETE,
      'delete innovation hub'
    );
    return await this.innovationHubService.delete(deleteData.ID);
  }
}
