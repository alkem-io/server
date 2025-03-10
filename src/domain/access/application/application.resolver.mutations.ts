import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { IApplication } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeleteApplicationInput } from './dto/application.dto.delete';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class ApplicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private applicationService: ApplicationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Removes the specified User Application.',
  })
  async deleteUserApplication(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      application.authorization,
      AuthorizationPrivilege.DELETE,
      `delete application on RoleSet: ${application.id}`
    );
    return await this.applicationService.deleteApplication(deleteData);
  }
}
