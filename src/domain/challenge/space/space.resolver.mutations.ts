import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SpaceService } from './space.service';
import { UpdateSpaceInput } from '@domain/challenge/space';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SpaceAuthorizationService } from './space.service.authorization';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { ISpace } from './space.interface';
import { CreateChallengeOnSpaceInput } from './dto/space.dto.create.challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { ChallengeCreatedPayload } from './dto/space.challenge.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_CHALLENGE_CREATED } from '@common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums';
import { UpdateChallengeSettingsInput } from '../challenge/dto/challenge.dto.update.settings';
import { UpdateSpaceSettingsOnSpaceInput } from './dto/space.dto.update.settings';

@Resolver()
export class SpaceResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private challengeService: ChallengeService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    @Inject(SUBSCRIPTION_CHALLENGE_CREATED)
    private challengeCreatedSubscription: PubSubEngine,
    private namingReporter: NameReporterService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Updates the Space.',
  })
  @Profiling.api
  async updateSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceData') spaceData: UpdateSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceData.ID, {
      relations: {
        profile: true,
      },
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateSpace: ${space.nameID}`
    );

    // ensure working with UUID
    spaceData.ID = space.id;

    const updatedSpace = await this.spaceService.update(spaceData);

    this.contributionReporter.spaceContentEdited(
      {
        id: updatedSpace.id,
        name: updatedSpace.profile.displayName,
        space: updatedSpace.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    if (
      spaceData?.profileData?.displayName &&
      spaceData?.profileData?.displayName !== space.profile.displayName
    ) {
      this.namingReporter.createOrUpdateName(
        space.id,
        spaceData?.profileData?.displayName
      );
    }

    return updatedSpace;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Updates one of the Setting on a Space',
  })
  @Profiling.api
  async updateSpaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateSpaceSettingsOnSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(settingsData.spaceID);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `space settings update: ${space.id}`
    );

    const updatedSpace = await this.spaceService.updateSpaceSettings(
      space,
      settingsData
    );
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset
    await this.spaceAuthorizationService.applyAuthorizationPolicy(updatedSpace);
    return await this.spaceService.getSpaceOrFail(space.id);
  }

  // create mutation here because authorization policies need to be reset
  // resetting works only on top level entities
  // this way we avoid the complexity and circular dependencies introduced
  // resetting the challenge policies
  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Updates one of the settings on a Challenge',
  })
  @Profiling.api
  async updateChallengeSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateChallengeSettingsInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      settingsData.challengeID,
      {
        relations: {
          account: {
            space: true,
          },
        },
      }
    );
    if (!challenge.account || !challenge.account.space) {
      throw new EntityNotInitializedException(
        `Unable to find account for ${challenge.nameID}`,
        LogContext.CHALLENGES
      );
    }
    const spaceID = challenge.account.space.id;

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.UPDATE,
      `challenge settings update: ${challenge.id}`
    );

    const space = await this.spaceService.getSpaceOrFail(spaceID);
    // TODO: pass through the updated settings to the challenge service
    const updatedChallenge =
      await this.challengeService.updateChallengeSettings(
        challenge,
        settingsData
      );
    // As the settings may update the authorization, the authorization policy will need to be reset
    await this.challengeAuthorizationService.applyAuthorizationPolicy(
      updatedChallenge,
      space.authorization
    );
    return await this.challengeService.getChallengeOrFail(challenge.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new Challenge within the specified Space.',
  })
  @Profiling.api
  async createChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateChallengeOnSpaceInput
  ): Promise<IChallenge> {
    const space = await this.spaceService.getSpaceOrFail(
      challengeData.spaceID,
      {
        relations: {
          account: {
            license: {
              featureFlags: true,
            },
          },
        },
      }
    );
    if (!space.account || !space.account.license) {
      throw new EntityNotInitializedException(
        `Unabl to load license for Space: ${space.id}`,
        LogContext.CHALLENGES
      );
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
      `challengeCreate: ${space.nameID}`
    );

    // For the creation based on the template from another challenge require platform admin privileges
    if (challengeData.collaborationData?.collaborationTemplateID) {
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.CREATE,
        `challengeCreate using challenge template: ${space.nameID} - ${challengeData.collaborationData.collaborationTemplateID}`
      );
    }
    const challenge = await this.spaceService.createChallengeInSpace(
      challengeData,
      agentInfo
    );

    await this.challengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      space.authorization
    );

    this.activityAdapter.challengeCreated(
      {
        triggeredBy: agentInfo.userID,
        challenge: challenge,
      },
      space.id
    );

    this.contributionReporter.challengeCreated(
      {
        id: challenge.id,
        name: challenge.profile.displayName,
        space: space.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    const challengeCreatedEvent: ChallengeCreatedPayload = {
      eventID: `space-challenge-created-${Math.round(Math.random() * 100)}`,
      spaceID: space.id,
      challenge,
    };
    this.challengeCreatedSubscription.publish(
      SubscriptionType.CHALLENGE_CREATED,
      challengeCreatedEvent
    );

    return challenge;
  }
}
