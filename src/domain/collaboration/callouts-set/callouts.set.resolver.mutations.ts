import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.published';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICallout } from '../callout/callout.interface';
import { CalloutService } from '../callout/callout.service';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetService } from './callouts.set.service';
import { CreateCalloutOnCalloutsSetInput } from './dto/callouts.set.dto.create.callout';
import { UpdateCalloutsSortOrderInput } from './dto/callouts.set.dto.update.callouts.sort.order';

@InstrumentResolver()
@Resolver()
export class CalloutsSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private calloutService: CalloutService,
    private communityResolverService: CommunityResolverService,
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    private roomResolverService: RoomResolverService,
    private temporaryStorageService: TemporaryStorageService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ICallout, {
    description: 'Create a new Callout on the CalloutsSet.',
  })
  async createCalloutOnCalloutsSet(
    @CurrentActor() actorContext: ActorContext,
    @Args('calloutData') calloutData: CreateCalloutOnCalloutsSetInput
  ): Promise<ICallout> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(
      calloutData.calloutsSetID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      calloutsSet.authorization,
      AuthorizationPrivilege.CREATE_CALLOUT,
      `create callout on callouts Set: ${calloutsSet.id}`
    );

    const callout = await this.calloutsSetService.createCalloutOnCalloutsSet(
      calloutData,
      actorContext.actorID
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

    let roleSet: IRoleSet | undefined;
    let platformRolesAccess: IPlatformRolesAccess = {
      roles: [],
    };
    let spaceSettings;
    if (calloutsSet.type === CalloutsSetType.COLLABORATION) {
      const roleSetAndSettings =
        await this.roomResolverService.getRoleSetAndSettingsForCollaborationCalloutsSet(
          calloutsSet.id
        );
      roleSet = roleSetAndSettings.roleSet;
      platformRolesAccess = roleSetAndSettings.platformRolesAccess;
      spaceSettings = roleSetAndSettings.spaceSettings;
    }
    const authorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout.id,
        calloutsSet.authorization,
        platformRolesAccess,
        roleSet,
        spaceSettings
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    if (calloutsSet.type === CalloutsSetType.COLLABORATION) {
      if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
        if (calloutData.sendNotification) {
          const notificationInput: NotificationInputCalloutPublished = {
            triggeredBy: actorContext.actorID,
            callout: callout,
          };
          this.notificationAdapterSpace.spaceCollaborationCalloutPublished(
            notificationInput
          );
        }

        const activityLogInput: ActivityInputCalloutPublished = {
          triggeredBy: actorContext.actorID,
          callout: callout,
        };
        this.activityAdapter.calloutPublished(activityLogInput);
      }

      const levelZeroSpaceID =
        await this.communityResolverService.getLevelZeroSpaceIdForCalloutsSet(
          calloutsSet.id
        );

      this.contributionReporter.calloutCreated(
        {
          id: callout.id,
          name: callout.nameID,
          space: levelZeroSpaceID,
        },
        {
          id: actorContext.actorID,
          email: actorContext.actorID,
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
    @CurrentActor() actorContext: ActorContext,
    @Args('sortOrderData')
    sortOrderData: UpdateCalloutsSortOrderInput
  ): Promise<ICallout[]> {
    const calloutsSet = await this.calloutsSetService.getCalloutsSetOrFail(
      sortOrderData.calloutsSetID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
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
