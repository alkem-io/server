import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IApplication } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { DeleteApplicationInput } from './dto/application.dto.delete';

@InstrumentResolver()
@Resolver()
export class ApplicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private applicationService: ApplicationService
  ) {}

  @Mutation(() => IApplication, {
    description: 'Removes the specified User Application.',
  })
  async deleteUserApplication(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      application.authorization,
      AuthorizationPrivilege.DELETE,
      `delete application on RoleSet: ${application.id}`
    );
    return await this.applicationService.deleteApplication(deleteData);
  }
}
