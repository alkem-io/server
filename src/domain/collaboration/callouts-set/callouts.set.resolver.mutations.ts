import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICallout } from '../callout/callout.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutService } from '../callout/callout.service';
import { CalloutsSetService } from './callouts.set.service';
import { CreateCalloutOnCalloutsSetInput } from './dto/callouts.set.dto.create.callout';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.published';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { UpdateCalloutsSortOrderInput } from './dto/callouts.set.dto.update.callouts.sort.order';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@InstrumentResolver()
@Resolver()
export class CalloutsSetResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly calloutsSetService: CalloutsSetService,
    private readonly calloutAuthorizationService: CalloutAuthorizationService,
    private readonly calloutService: CalloutService,
    private readonly communityResolverService: CommunityResolverService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly activityAdapter: ActivityAdapter,
    private readonly notificationAdapterSpace: NotificationSpaceAdapter,
    private readonly roomResolverService: RoomResolverService,
    private readonly temporaryStorageService: TemporaryStorageService,
    private readonly userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ICallout, {
    description: 'Create a new Callout on the CalloutsSet.',
  })
  async createCalloutOnCalloutsSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: CreateCalloutOnCalloutsSetInput
  ): Promise<ICallout> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(
      calloutData.calloutsSetID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calloutsSet.authorization,
      AuthorizationPrivilege.CREATE_CALLOUT,
      `create callout on callouts Set: ${calloutsSet.id}`
    );

    const callout = await this.calloutsSetService.createCalloutOnCalloutsSet(
      calloutData,
      agentInfo.userID
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

    let roleSet: IRoleSet | undefined = undefined;
    let platformRolesAccess: IPlatformRolesAccess = {
      roles: [],
    };
    if (calloutsSet.type === CalloutsSetType.COLLABORATION) {
      const roleSetAndSettings =
        await this.roomResolverService.getRoleSetAndSettingsForCollaborationCalloutsSet(
          calloutsSet.id
        );
      roleSet = roleSetAndSettings.roleSet;
      platformRolesAccess = roleSetAndSettings.platformRolesAccess;
    }
    const authorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout.id,
        calloutsSet.authorization,
        platformRolesAccess,
        roleSet
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    if (calloutsSet.type === CalloutsSetType.COLLABORATION) {
      if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
        if (calloutData.sendNotification) {
          const notificationInput: NotificationInputCalloutPublished = {
            triggeredBy: agentInfo.userID,
            callout: callout,
          };
          this.notificationAdapterSpace.spaceCollaborationCalloutPublished(
            notificationInput
          );
        }

        const activityLogInput: ActivityInputCalloutPublished = {
          triggeredBy: agentInfo.userID,
          callout: callout,
        };
        this.activityAdapter.calloutPublished(activityLogInput);
      }

      const levelZeroSpaceID =
        await this.communityResolverService.getLevelZeroSpaceIdForCalloutsSet(
          calloutsSet.id
        );

      const user = await this.userLookupService.getUserOrFail(agentInfo.userID);
      this.contributionReporter.calloutCreated(
        {
          id: callout.id,
          name: callout.nameID,
          space: levelZeroSpaceID,
        },
        {
          id: agentInfo.userID,
          email: user.email,
        }
      );
    }

    return await this.calloutService.getCalloutOrFail(callout.id);
  }

  @Mutation(() => [ICallout], {
    description:
      'Update the sortOrder field of the supplied Callouts to increase as per the order that they are provided in.',
  })
  async updateCalloutsSortOrder(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('sortOrderData')
    sortOrderData: UpdateCalloutsSortOrderInput
  ): Promise<ICallout[]> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(
      sortOrderData.calloutsSetID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calloutsSet.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callouts sort order on collaboration: ${calloutsSet.id}`
    );

    return this.calloutsSetService.updateCalloutsSortOrder(
      calloutsSet,
      sortOrderData
    );
  }
}
