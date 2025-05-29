import { Inject } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { TemplateContentSpaceService } from './templateContentSpace.service';
import {
  DeleteTemplateContentSpaceInput,
  UpdateTemplateContentSpaceInput,
} from '@domain/templateContentSpace/templateContentSpace';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateContentSpaceAuthorizationService } from './templateContentSpace.service.authorization';
import { ITemplateContentSpace } from './templateContentSpace.interface';
import { CreateSubtemplateContentSpaceInput } from './dto/templateContentSpace.dto.create.subtemplateContentSpace';
import { SubtemplateContentSpaceCreatedPayload } from './dto/templateContentSpace.subtemplateContentSpace.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { PubSubEngine } from 'graphql-subscriptions';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { UpdateTemplateContentSpacePlatformSettingsInput } from './dto/templateContentSpace.dto.update.platform.settings';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { UpdateTemplateContentSpaceSettingsInput } from './dto/templateContentSpace.dto.update.settings';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplateContentSpaceLicenseService } from './templateContentSpace.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class TemplateContentSpaceResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private templateContentSpaceService: TemplateContentSpaceService,
    private templateContentSpaceAuthorizationService: TemplateContentSpaceAuthorizationService,
    @Inject(SUBSCRIPTION_SUBSPACE_CREATED)
    private subtemplateContentSpaceCreatedSubscription: PubSubEngine,
    private namingReporter: NameReporterService,
    private templateContentSpaceLicenseService: TemplateContentSpaceLicenseService,
    private licenseService: LicenseService
  ) {}

  @Mutation(() => ITemplateContentSpace, {
    description: 'Updates the TemplateContentSpace.',
  })
  @Profiling.api
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateContentSpace.authorization,
      AuthorizationPrivilege.UPDATE,
      `update TemplateContentSpace: ${templateContentSpace.id}`
    );

    const updatedTemplateContentSpace =
      await this.templateContentSpaceService.update(templateContentSpaceData);

    this.contributionReporter.templateContentSpaceContentEdited(
      {
        id: updatedTemplateContentSpace.id,
        name: updatedTemplateContentSpace.about.profile.displayName,
        templateContentSpace: updatedTemplateContentSpace.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    if (
      templateContentSpaceData?.about?.profile?.displayName &&
      templateContentSpaceData?.about?.profile?.displayName !==
        templateContentSpace.about.profile.displayName
    ) {
      this.namingReporter.createOrUpdateName(
        templateContentSpace.id,
        templateContentSpaceData?.about?.profile?.displayName
      );
    }

    return updatedTemplateContentSpace;
  }

  @Mutation(() => ITemplateContentSpace, {
    description: 'Deletes the specified TemplateContentSpace.',
  })
  async deleteTemplateContentSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteTemplateContentSpaceInput
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        deleteData.ID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateContentSpace.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteTemplateContentSpace: ${templateContentSpace.nameID}`
    );
    return await this.templateContentSpaceService.deleteTemplateContentSpaceOrFail(
      deleteData
    );
  }

  @Mutation(() => ITemplateContentSpace, {
    description: 'Updates one of the Setting on a TemplateContentSpace',
  })
  async updateTemplateContentSpaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateTemplateContentSpaceSettingsInput
  ): Promise<ITemplateContentSpace> {
    let templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        settingsData.templateContentSpaceID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateContentSpace.authorization,
      AuthorizationPrivilege.UPDATE,
      `templateContentSpace settings update: ${templateContentSpace.id}`
    );

    const shouldUpdateAuthorization =
      await this.templateContentSpaceService.shouldUpdateAuthorizationPolicy(
        templateContentSpace.id,
        settingsData.settings
      );

    templateContentSpace =
      await this.templateContentSpaceService.updateTemplateContentSpaceSettings(
        templateContentSpace,
        settingsData
      );
    templateContentSpace =
      await this.templateContentSpaceService.save(templateContentSpace);
    // As the settings may update the authorization for the TemplateContentSpace, the authorization policy will need to be reset
    // but not all settings will require this, so only update if necessary
    if (shouldUpdateAuthorization) {
      const updatedAuthorizations =
        await this.templateContentSpaceAuthorizationService.applyAuthorizationPolicy(
          templateContentSpace.id
        );
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    }

    return this.templateContentSpaceService.getTemplateContentSpaceOrFail(
      templateContentSpace.id
    );
  }

  @Mutation(() => ITemplateContentSpace, {
    description:
      'Update the platform settings, such as nameID, of the specified TemplateContentSpace.',
  })
  async updateTemplateContentSpacePlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateTemplateContentSpacePlatformSettingsInput
  ): Promise<ITemplateContentSpace> {
    let templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        updateData.templateContentSpaceID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateContentSpace.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on templateContentSpace: ${templateContentSpace.id}`
    );

    templateContentSpace =
      await this.templateContentSpaceService.updateTemplateContentSpacePlatformSettings(
        templateContentSpace,
        updateData
      );
    templateContentSpace =
      await this.templateContentSpaceService.save(templateContentSpace);
    const updatedAuthorizations =
      await this.templateContentSpaceAuthorizationService.applyAuthorizationPolicy(
        templateContentSpace.id
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
      templateContentSpace.id
    );
  }

  @Mutation(() => ITemplateContentSpace, {
    description:
      'Creates a new SubtemplateContentSpace within the specified TemplateContentSpace.',
  })
  @Profiling.api
  async createSubtemplateContentSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('subtemplateContentSpaceData')
    subtemplateContentSpaceData: CreateSubtemplateContentSpaceInput
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        subtemplateContentSpaceData.templateContentSpaceID,
        {
          relations: {},
        }
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateContentSpace.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
      `subtemplateContentSpace create in: ${templateContentSpace.id}`
    );

    const subtemplateContentSpace =
      await this.templateContentSpaceService.createSubtemplateContentSpace(
        subtemplateContentSpaceData,
        agentInfo
      );
    // Save here so can reuse it later without another load
    const displayName = subtemplateContentSpace.about.profile.displayName;
    const updatedAuthorizations =
      await this.templateContentSpaceAuthorizationService.applyAuthorizationPolicy(
        subtemplateContentSpace.id,
        templateContentSpace.authorization // Important, and will be stored
      );

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    this.activityAdapter.subtemplateContentSpaceCreated({
      triggeredBy: agentInfo.userID,
      subtemplateContentSpace,
    });

    this.contributionReporter.subtemplateContentSpaceCreated(
      {
        id: subtemplateContentSpace.id,
        name: displayName,
        templateContentSpace: templateContentSpace.id, //TODO: should this be a root templateContentSpace ID?
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    const level0TemplateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        subtemplateContentSpace.levelZeroTemplateContentSpaceID,
        {
          relations: { agent: { credentials: true } },
        }
      );

    const updatedLicenses =
      await this.templateContentSpaceLicenseService.applyLicensePolicy(
        subtemplateContentSpace.id,
        level0TemplateContentSpace.agent
      );
    await this.licenseService.saveAll(updatedLicenses);

    const newSubtemplateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        subtemplateContentSpace.id
      );

    const subtemplateContentSpaceCreatedEvent: SubtemplateContentSpaceCreatedPayload =
      {
        eventID: `templateContentSpace-challenge-created-${Math.round(Math.random() * 100)}`,
        templateContentSpaceID: templateContentSpace.id,
        subtemplateContentSpace: newSubtemplateContentSpace,
      };
    this.subtemplateContentSpaceCreatedSubscription.publish(
      SubscriptionType.SUBSPACE_CREATED,
      subtemplateContentSpaceCreatedEvent
    );

    return newSubtemplateContentSpace;
  }
}
