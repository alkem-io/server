import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InstrumentResolver } from '@src/apm/decorators';
import { TemplateContentSpaceService } from './template.content.space.service';
import { ITemplateContentSpace } from './template.content.space.interface';
import { UpdateTemplateContentSpaceInput } from './dto/template.content.space.dto.update';

@InstrumentResolver()
@Resolver()
export class TemplateContentSpaceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templateContentSpaceService: TemplateContentSpaceService
  ) {}

  @Mutation(() => ITemplateContentSpace, {
    description: 'Updates the TemplateContentSpace.',
  })
  async updateTemplateContentSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateContentSpaceData')
    templateContentSpaceData: UpdateTemplateContentSpaceInput
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateContentSpaceData.ID,
        {
          relations: {
            about: {
              profile: true,
            },
          },
        }
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateContentSpace.authorization,
      AuthorizationPrivilege.UPDATE,
      `update TemplateContentSpace: ${templateContentSpace.id}`
    );

    const updatedTemplateContentSpace =
      await this.templateContentSpaceService.update(templateContentSpaceData);

    return updatedTemplateContentSpace;
  }
}
