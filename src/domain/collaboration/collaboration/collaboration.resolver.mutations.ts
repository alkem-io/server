import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
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
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';

@Resolver()
export class CollaborationResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private contributionReporter: ContributionReporterService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private temporaryStorageService: TemporaryStorageService
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
      await this.collaborationService.createCalloutOnCollaboration(
        calloutData,
        agentInfo.userID
      );

    const { roleSet: communityPolicy, spaceSettings } =
      await this.namingService.getRoleSetAndSettingsForCollaboration(
        collaboration.id
      );
    // callout needs to be saved to apply the authorization policy
    await this.calloutService.save(callout);

    // Now the contribution is saved, we can look to move any temporary documents
    // to be stored in the storage bucket of the profile.
    // Note: important to do before auth reset is done
    const destinationStorageBucket = await this.calloutService.getStorageBucket(
      callout.id
    );
    await this.temporaryStorageService.moveTemporaryDocuments(
      calloutData,
      destinationStorageBucket
    );

    const authorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout.id,
        collaboration.authorization,
        communityPolicy,
        spaceSettings
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      if (calloutData.sendNotification) {
        const notificationInput: NotificationInputCalloutPublished = {
          triggeredBy: agentInfo.userID,
          callout: callout,
        };
        this.notificationAdapter.calloutPublished(notificationInput);
      }

      const activityLogInput: ActivityInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        callout: callout,
      };
      this.activityAdapter.calloutPublished(activityLogInput);
    }

    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCollaboration(
        collaboration.id
      );

    this.contributionReporter.calloutCreated(
      {
        id: callout.id,
        name: callout.nameID,
        space: levelZeroSpaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return await this.calloutService.getCalloutOrFail(callout.id);
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
