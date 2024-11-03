import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UpdateCollaborationFromTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateApplierService } from './template.applier.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration';

@Resolver()
export class TemplateApplierResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private templateApplierService: TemplateApplierService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICollaboration, {
    description:
      'Updates the Collaboration, including InnovationFlow states, from the specified Collaboration Template.',
  })
  async updateCollaborationFromTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateCollaborationFromTemplateInput
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        updateData.collaborationID,
        {
          relations: {
            tagsetTemplateSet: true,
            callouts: {
              framing: {
                profile: {
                  tagsets: true,
                },
              },
            },
            innovationFlow: {
              profile: {
                tagsets: true,
              },
            },
          },
        }
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.UPDATE,
      `update InnovationFlow states from template: ${collaboration.id}`
    );

    return await this.templateApplierService.updateCollaborationFromTemplate(
      updateData,
      collaboration
    );
  }
}
