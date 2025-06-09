import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UpdateCollaborationFromSpaceTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateApplierService } from './template.applier.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CalloutsSetAuthorizationService } from '@domain/collaboration/callouts-set/callouts.set.service.authorization';

@InstrumentResolver()
@Resolver()
export class TemplateApplierResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private calloutsSetAuthorizationService: CalloutsSetAuthorizationService,
    private templateApplierService: TemplateApplierService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ICollaboration, {
    description:
      'Updates a Collaboration, including InnovationFlow states, using the Space content from the specified Template.',
  })
  async updateCollaborationFromSpaceTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateCollaborationFromSpaceTemplateInput
  ): Promise<ICollaboration> {
    let targetCollaboration =
      await this.collaborationService.getCollaborationOrFail(
        updateData.collaborationID,
        {
          relations: {
            calloutsSet: {
              tagsetTemplateSet: true,
              callouts: {
                classification: {
                  tagsets: true,
                },
              },
            },
            innovationFlow: {
              flowStatesTagsetTemplate: true,
            },
          },
        }
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      targetCollaboration.authorization,
      AuthorizationPrivilege.UPDATE,
      `update InnovationFlow states from template: ${targetCollaboration.id}`
    );

    targetCollaboration =
      await this.templateApplierService.updateCollaborationFromSpaceTemplate(
        updateData,
        targetCollaboration,
        agentInfo.userID
      );
    // Reset the authorization policy to re-evaluate the access control rules.
    targetCollaboration =
      await this.collaborationService.getCollaborationOrFail(
        targetCollaboration.id,
        {
          relations: {
            calloutsSet: {
              callouts: true,
            },
            authorization: true,
          },
        }
      );
    if (!targetCollaboration.calloutsSet?.callouts) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve callouts for collaboration: ${targetCollaboration.id}`,
        LogContext.TEMPLATES
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] =
      await this.calloutsSetAuthorizationService.applyAuthorizationPolicy(
        targetCollaboration.calloutsSet,
        targetCollaboration.authorization
      );

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return this.collaborationService.getCollaborationOrFail(
      targetCollaboration.id
    );
  }
}
