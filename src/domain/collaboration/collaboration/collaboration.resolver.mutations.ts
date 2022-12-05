import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RelationAuthorizationService } from '@domain/collaboration/relation/relation.service.authorization';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { CreateRelationOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.relation';
import { CreateCalloutOnCollaborationInput } from './dto/collaboration.dto.create.callout';
import { DeleteCollaborationInput } from './dto/collaboration.dto.delete';
import { ICallout } from '../callout/callout.interface';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { ICollaboration } from './collaboration.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCollaborationInterest } from '@services/adapters/notification-adapter/dto/notification.dto.input.collaboration.interest';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';

@Resolver()
export class CollaborationResolverMutations {
  constructor(
    private relationAuthorizationService: RelationAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICollaboration, {
    description: 'Delete Collaboration.',
  })
  @Profiling.api
  async deleteCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCollaborationInput
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.DELETE,
      `delete collaboration: ${collaboration.id}`
    );
    return await this.collaborationService.deleteCollaboration(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Collaboration.',
  })
  @Profiling.api
  async createRelationOnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('relationData') relationData: CreateRelationOnCollaborationInput
  ): Promise<IRelation> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        relationData.collaborationID
      );
    // Extend the authorization definition to use for creating the relation
    const authorization =
      this.relationAuthorizationService.localExtendAuthorizationPolicy(
        collaboration.authorization
      );
    // First check if the user has read access
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.READ,
      `read relation on collaboration: ${collaboration.id}`
    );
    // Then check if the user can create
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create relation on collaboration: ${collaboration.id}`
    );
    // Load the authorization policy again to avoid the temporary extension above
    const collaboriationAuthorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorization.id
      );
    const relation =
      await this.collaborationService.createRelationOnCollaboration(
        relationData
      );

    // Send the notification
    const notificationInput: NotificationInputCollaborationInterest = {
      triggeredBy: agentInfo.userID,
      relation: relation,
      collaboration: collaboration,
    };
    await this.notificationAdapter.collaborationInterest(notificationInput);

    return await this.relationAuthorizationService.applyAuthorizationPolicy(
      relation,
      collaboriationAuthorizationPolicy,
      agentInfo.userID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Create a new Callout on the Collaboration.',
  })
  @Profiling.api
  async createCalloutOnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: CreateCalloutOnCollaborationInput
  ): Promise<ICallout> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        calloutData.collaborationID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.CREATE_CALLOUT,
      `create callout on collaboration: ${collaboration.id}`
    );

    const callout =
      await this.collaborationService.createCalloutOnCollaboration(calloutData);

    const communityPolicy = await this.collaborationService.getCommunityPolicy(
      collaboration.id
    );

    const calloutAuthorized =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout,
        collaboration.authorization,
        communityPolicy
      );

    if (calloutAuthorized.visibility === CalloutVisibility.PUBLISHED) {
      const notificationInput: NotificationInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        callout: callout,
      };
      await this.notificationAdapter.calloutPublished(notificationInput);

      const activityLogInput: ActivityInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        callout: callout,
      };
      this.activityAdapter.calloutPublished(activityLogInput);
    }

    return calloutAuthorized;
  }
}
