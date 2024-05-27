import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
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
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UpdateCollaborationCalloutsSortOrderInput } from './dto/collaboration.dto.update.callouts.sort.order';
import { CalloutService } from '../callout/callout.service';

@Resolver()
export class CollaborationResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private contributionReporter: ContributionReporterService,
    private relationAuthorizationService: RelationAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private calloutService: CalloutService
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.DELETE,
      `delete collaboration: ${collaboration.id}`
    );
    return this.collaborationService.deleteCollaboration(deleteData.ID);
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
    const collaborationAuthorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorization.id
      );
    const relation =
      await this.collaborationService.createRelationOnCollaboration(
        relationData
      );

    return this.relationAuthorizationService.applyAuthorizationPolicy(
      relation,
      collaborationAuthorizationPolicy,
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

    let callout = await this.collaborationService.createCalloutOnCollaboration(
      calloutData,
      agentInfo.userID
    );

    const communityPolicy = await this.collaborationService.getCommunityPolicy(
      collaboration.id
    );

    callout = await this.calloutAuthorizationService.applyAuthorizationPolicy(
      callout,
      collaboration.authorization,
      communityPolicy
    );
    callout = await this.calloutService.save(callout);

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      if (calloutData.sendNotification) {
        const notificationInput: NotificationInputCalloutPublished = {
          triggeredBy: agentInfo.userID,
          callout: callout,
        };
        await this.notificationAdapter.calloutPublished(notificationInput);
      }

      const activityLogInput: ActivityInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        callout: callout,
      };
      this.activityAdapter.calloutPublished(activityLogInput);
    }

    const community =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );
    const spaceID =
      await this.communityResolverService.getRootSpaceIDFromCommunityOrFail(
        community
      );

    this.contributionReporter.calloutCreated(
      {
        id: callout.id,
        name: callout.nameID,
        space: spaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return callout;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => [ICallout], {
    description:
      'Update the sortOrder field of the supplied Callouts to increase as per the order that they are provided in.',
  })
  @Profiling.api
  async updateCalloutsSortOrder(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('sortOrderData')
    sortOrderData: UpdateCollaborationCalloutsSortOrderInput
  ): Promise<ICallout[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        sortOrderData.collaborationID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callouts sort order on collaboration: ${collaboration.id}`
    );

    return this.collaborationService.updateCalloutsSortOrder(
      collaboration,
      sortOrderData
    );
  }
}
