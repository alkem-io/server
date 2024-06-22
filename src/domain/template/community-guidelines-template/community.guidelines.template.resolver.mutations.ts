import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunityGuidelinesTemplateService } from './community.guidelines.template.service';
import { DeleteCommunityGuidelinesTemplateInput } from './dto/community.guidelines.template.dto.delete';
import { ICommunityGuidelinesTemplate } from './community.guidelines.template.interface';
import { UpdateCommunityGuidelinesTemplateInput } from './dto/community.guidelines.template.dto.update';

@Resolver()
export class CommunityGuidelinesTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communityGuidelinesTemplateService: CommunityGuidelinesTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunityGuidelinesTemplate, {
    description: 'Updates the specified CommunityGuidelinesTemplate.',
  })
  async updateCommunityGuidelinesTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('communityGuidelinesTemplateInput')
    communityGuidelinesTemplateInput: UpdateCommunityGuidelinesTemplateInput
  ): Promise<ICommunityGuidelinesTemplate> {
    const communityGuidelinesTemplate =
      await this.communityGuidelinesTemplateService.getCommunityGuidelinesTemplateOrFail(
        communityGuidelinesTemplateInput.ID,
        {
          relations: { profile: true },
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communityGuidelinesTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update communityguidelines template: ${communityGuidelinesTemplate.id}`
    );
    return await this.communityGuidelinesTemplateService.updateCommunityGuidelinesTemplate(
      communityGuidelinesTemplate.id,
      communityGuidelinesTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunityGuidelinesTemplate, {
    description: 'Deletes the specified CommunityGuidelines Template.',
  })
  async deleteCommunityGuidelinesTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCommunityGuidelinesTemplateInput
  ): Promise<ICommunityGuidelinesTemplate> {
    const communityGuidelinesTemplate =
      await this.communityGuidelinesTemplateService.getCommunityGuidelinesTemplateOrFail(
        deleteData.ID,
        {
          relations: { profile: true },
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communityGuidelinesTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `community guidelines template delete: ${communityGuidelinesTemplate.id}`
    );
    return await this.communityGuidelinesTemplateService.deleteCommunityGuidelinesTemplate(
      communityGuidelinesTemplate
    );
  }
}
