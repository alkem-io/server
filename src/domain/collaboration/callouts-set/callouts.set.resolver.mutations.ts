import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICallout } from '../callout/callout.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
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
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { UpdateCalloutsSortOrderInput } from './dto/callouts.set.dto.update.callouts.sort.order';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { InstrumentResolver } from '@src/apm/decorators';

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
    private notificationAdapter: NotificationAdapter,
    private namingService: NamingService,
    private temporaryStorageService: TemporaryStorageService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
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
    let spaceSettings: ISpaceSettings | undefined = undefined;
    if (calloutsSet.type === CalloutsSetType.COLLABORATION) {
      const roleSetAndSettings =
        await this.namingService.getRoleSetAndSettingsForCollaborationCalloutsSet(
          calloutsSet.id
        );
      roleSet = roleSetAndSettings.roleSet;
      spaceSettings = roleSetAndSettings.spaceSettings;
    }
    const authorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout.id,
        calloutsSet.authorization,
        roleSet,
        spaceSettings
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    if (calloutsSet.type === CalloutsSetType.COLLABORATION) {
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
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    }

    return await this.calloutService.getCalloutOrFail(callout.id);
  }

  @UseGuards(GraphqlGuard)
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
