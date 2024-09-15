import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoleManagerService } from './role.manager.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { UpdateRoleManagerApplicationFormInput } from './dto/role.manager.dto.update.application.form';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRoleManager } from './role.manager.interface';

@Resolver()
export class RoleManagerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roleManagerService: RoleManagerService,
    private agentService: AgentService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRoleManager, {
    description: 'Update the Application Form used by this RoleManager.',
  })
  @Profiling.api
  async updateRoleManagerApplicationForm(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationFormData')
    applicationFormData: UpdateRoleManagerApplicationFormInput
  ): Promise<IRoleManager> {
    const roleManager = await this.roleManagerService.getRoleManagerOrFail(
      applicationFormData.roleManagerID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleManager.authorization,
      AuthorizationPrivilege.UPDATE,
      `update roleManager application form: ${roleManager.id}`
    );

    return await this.roleManagerService.updateApplicationForm(
      roleManager,
      applicationFormData.formData
    );
  }
}
