import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IInnovationHub } from './innovation.hub.interface';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DeleteInnovationHubInput } from '@domain/innovation-hub/dto';
import { InnovationHubService } from './innovation.hub.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateInnovationHubInput } from '@domain/innovation-hub/dto';
import { InstrumentResolver } from '@src/apm/decorators';

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
    @CurrentUser() actorContext: ActorContext,
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
    @CurrentUser() actorContext: ActorContext,
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
