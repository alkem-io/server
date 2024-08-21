import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ISpaceDefaults } from './space.defaults.interface';
import { UpdateSpaceDefaultsInput } from './dto/space.defaults.dto.update';
import { SpaceDefaultsService } from './space.defaults.service';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';

@Resolver()
export class SpaceDefaultsResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private spaceDefaultsService: SpaceDefaultsService,
    private innovationFlowTemplateService: InnovationFlowTemplateService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpaceDefaults, {
    description: 'Updates the specified SpaceDefaults.',
  })
  async updateSpaceDefaults(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceDefaultsData')
    spaceDefaultsData: UpdateSpaceDefaultsInput
  ): Promise<ISpaceDefaults> {
    const spaceDefaults =
      await this.spaceDefaultsService.getSpaceDefaultsOrFail(
        spaceDefaultsData.spaceDefaultsID,
        {}
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      spaceDefaults.authorization,
      AuthorizationPrivilege.UPDATE,
      `update spaceDefaults: ${spaceDefaults.id}`
    );

    if (spaceDefaultsData.flowTemplateID) {
      const innovationFlowTemplate =
        await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
          spaceDefaultsData.flowTemplateID
        );
      return await this.spaceDefaultsService.updateSpaceDefaults(
        spaceDefaults,
        innovationFlowTemplate
      );
    }
    return spaceDefaults;
  }
}
