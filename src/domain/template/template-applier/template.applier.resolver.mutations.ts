import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutsSetAuthorizationService } from '@domain/collaboration/callouts-set/callouts.set.service.authorization';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowAuthorizationService } from '@domain/collaboration/innovation-flow/innovation.flow.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateCollaborationFromSpaceTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateApplierService } from './template.applier.service';

@InstrumentResolver()
@Resolver()
export class TemplateApplierResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private calloutsSetAuthorizationService: CalloutsSetAuthorizationService,
    private innovationFlowAuthorizationService: InnovationFlowAuthorizationService,
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
              states: true,
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
            innovationFlow: {
              states: true,
            },
            calloutsSet: {
              callouts: true,
            },
            authorization: true,
          },
        }
      );
    if (
      !targetCollaboration.calloutsSet?.callouts ||
      !targetCollaboration.innovationFlow
    ) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve callouts for collaboration: ${targetCollaboration.id}`,
        LogContext.TEMPLATES
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] =
      await this.calloutsSetAuthorizationService.applyAuthorizationPolicy(
        targetCollaboration.calloutsSet,
        targetCollaboration.authorization,
        {
          roles: [],
        }
      );
    updatedAuthorizations.push(
      ...(await this.innovationFlowAuthorizationService.applyAuthorizationPolicy(
        targetCollaboration.innovationFlow.id,
        targetCollaboration.authorization
      ))
    );

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return this.collaborationService.getCollaborationOrFail(
      targetCollaboration.id
    );
  }
}
