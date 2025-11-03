import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { SpaceService } from './space.service';
import { DeleteSpaceInput, UpdateSpaceInput } from '@domain/space/space';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SpaceAuthorizationService } from './space.service.authorization';
import { ISpace } from './space.interface';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { SubspaceCreatedPayload } from './dto/space.subspace.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { PubSubEngine } from 'graphql-subscriptions';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLicenseService } from './space.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { AuthRemoteEvaluationService } from '@services/external/auth-remote-evaluation';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import { Space } from './space.entity';

@InstrumentResolver()
@Resolver()
export class SpaceResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    @Inject(SUBSCRIPTION_SUBSPACE_CREATED)
    private subspaceCreatedSubscription: PubSubEngine,
    private spaceLicenseService: SpaceLicenseService,
    private licenseService: LicenseService,
    private authEvaluationService: AuthRemoteEvaluationService,
    @InjectEntityManager()
    private entityManager: EntityManager
  ) {}

  @Mutation(() => String)
  async benchMarkAuth(
    @Args('runs', { type: () => Number, defaultValue: 1 }) runs: number
  ) {
    const users = (
      await this.entityManager.find(User, {
        relations: { agent: true },
      })
    ).slice(0, 100);
    const spaces = (
      await this.entityManager.find(Space, {
        where: { level: 0 },
      })
    ).slice(0, 100);

    const totalOperations = spaces.length * users.length;
    console.log(`\n=== Starting Benchmark: ${runs} runs ===`);
    console.log(`Operations per run: ${totalOperations}`);
    console.log(`Total operations: ${totalOperations * runs}\n`);

    const allRunsData = [];

    for (let runIndex = 0; runIndex < runs; runIndex++) {
      console.log(`\n--- Run ${runIndex + 1}/${runs} ---`);
      const perfData = [];
      let counter = 0;

      for (const space of spaces) {
        for (const user of users) {
          const data = await this.authorizationService.compareImplementations(
            user.agent.id,
            space!.authorization!.id,
            AuthorizationPrivilege.READ
          );
          perfData.push({
            ...data,
            agentId: user.agent.id,
            policyId: space.authorization?.id || 'N/A',
            privilege: AuthorizationPrivilege.READ,
          });

          if (counter % 100 === 0 || counter === totalOperations - 1) {
            console.log(
              `  Progress: ${++counter}/${totalOperations} (${((counter / totalOperations) * 100).toFixed(1)}%)`
            );
          } else {
            counter++;
          }
        }
      }

      allRunsData.push(perfData);
    }

    // Helper function to calculate statistics
    const calculateStats = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, val) => acc + val, 0);
      const mean = sum / sorted.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const median = sorted[Math.floor(sorted.length / 2)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      return { min, max, mean, median, p95, p99 };
    };

    // Process each run
    const runSummaries = allRunsData.map((perfData, runIndex) => {
      const discrepancies = perfData.filter(
        d => d.original.response !== d.remote.response
      );
      const totalDiscrepancies = discrepancies.length;
      const accuracyRate =
        ((perfData.length - totalDiscrepancies) / perfData.length) * 100;

      const localTimes = perfData.map(d => d.original.latency);
      const remoteTimes = perfData.map(d => d.remote.latency);

      const localStats = calculateStats(localTimes);
      const remoteStats = calculateStats(remoteTimes);

      const speedupRatios = perfData.map(
        d => d.original.latency / d.remote.latency
      );
      const avgSpeedupRatio =
        speedupRatios.reduce((acc, val) => acc + val, 0) / speedupRatios.length;

      const runSummary = {
        run: runIndex + 1,
        summary: {
          totalOperations: perfData.length,
          outputMatches: perfData.length - totalDiscrepancies,
          outputDiscrepancies: totalDiscrepancies,
          accuracyRate: accuracyRate.toFixed(2) + '%',
          status:
            totalDiscrepancies === 0
              ? '✓ All outputs match'
              : `✗ ${totalDiscrepancies} discrepancies found`,
        },
        performance: {
          localAuth: {
            mean: localStats.mean.toFixed(3) + 'ms',
            median: localStats.median.toFixed(3) + 'ms',
            p95: localStats.p95.toFixed(3) + 'ms',
            p99: localStats.p99.toFixed(3) + 'ms',
          },
          remoteAuth: {
            mean: remoteStats.mean.toFixed(3) + 'ms',
            median: remoteStats.median.toFixed(3) + 'ms',
            p95: remoteStats.p95.toFixed(3) + 'ms',
            p99: remoteStats.p99.toFixed(3) + 'ms',
          },
          speedupRatio: avgSpeedupRatio.toFixed(2) + 'x',
        },
        discrepancyCount: totalDiscrepancies,
        discrepancySample:
          totalDiscrepancies > 0
            ? discrepancies.slice(0, 3).map(d => ({
                agentId: d.agentId,
                policyId: d.policyId,
                original: d.original.response,
                remote: d.remote.response,
              }))
            : [],
      };

      console.log(`\n=== Run ${runIndex + 1} Summary ===`);
      console.log(JSON.stringify(runSummary, null, 2));

      return runSummary;
    });

    // Aggregate statistics across all runs
    const allLocalTimes = allRunsData.flatMap(d =>
      d.map(p => p.original.latency)
    );
    const allRemoteTimes = allRunsData.flatMap(d =>
      d.map(p => p.remote.latency)
    );
    const allDiscrepancies = allRunsData.flatMap(d =>
      d.filter(p => p.original.response !== p.remote.response)
    );

    const aggregateLocalStats = calculateStats(allLocalTimes);
    const aggregateRemoteStats = calculateStats(allRemoteTimes);
    const totalOperationsAcrossRuns = allRunsData.reduce(
      (sum, d) => sum + d.length,
      0
    );
    const aggregateAccuracy =
      ((totalOperationsAcrossRuns - allDiscrepancies.length) /
        totalOperationsAcrossRuns) *
      100;

    const aggregateSpeedupRatios = allRunsData.flatMap(d =>
      d.map(p => p.original.latency / p.remote.latency)
    );
    const aggregateSpeedupRatio =
      aggregateSpeedupRatios.reduce((acc, val) => acc + val, 0) /
      aggregateSpeedupRatios.length;

    const finalResults = {
      totalRuns: runs,
      runSummaries,
      aggregateSummary: {
        totalOperations: totalOperationsAcrossRuns,
        outputMatches: totalOperationsAcrossRuns - allDiscrepancies.length,
        outputDiscrepancies: allDiscrepancies.length,
        accuracyRate: aggregateAccuracy.toFixed(2) + '%',
        status:
          allDiscrepancies.length === 0
            ? '✓ All outputs match across all runs'
            : `✗ ${allDiscrepancies.length} total discrepancies found`,
      },
      aggregatePerformance: {
        localAuth: {
          min: aggregateLocalStats.min.toFixed(3) + 'ms',
          max: aggregateLocalStats.max.toFixed(3) + 'ms',
          mean: aggregateLocalStats.mean.toFixed(3) + 'ms',
          median: aggregateLocalStats.median.toFixed(3) + 'ms',
          p95: aggregateLocalStats.p95.toFixed(3) + 'ms',
          p99: aggregateLocalStats.p99.toFixed(3) + 'ms',
        },
        remoteAuth: {
          min: aggregateRemoteStats.min.toFixed(3) + 'ms',
          max: aggregateRemoteStats.max.toFixed(3) + 'ms',
          mean: aggregateRemoteStats.mean.toFixed(3) + 'ms',
          median: aggregateRemoteStats.median.toFixed(3) + 'ms',
          p95: aggregateRemoteStats.p95.toFixed(3) + 'ms',
          p99: aggregateRemoteStats.p99.toFixed(3) + 'ms',
        },
        comparison: {
          avgSpeedupRatio: aggregateSpeedupRatio.toFixed(2) + 'x',
          interpretation:
            aggregateSpeedupRatio < 1
              ? `Remote is ${(1 / aggregateSpeedupRatio).toFixed(2)}x SLOWER than local`
              : `Remote is ${aggregateSpeedupRatio.toFixed(2)}x FASTER than local`,
        },
      },
      allDiscrepancies:
        allDiscrepancies.length > 0
          ? allDiscrepancies.slice(0, 10).map((d, idx) => ({
              index: idx + 1,
              agentId: d.agentId,
              policyId: d.policyId,
              privilege: d.privilege,
              original: d.original.response,
              remote: d.remote.response,
            }))
          : 'No discrepancies',
    };

    // Log detailed discrepancy information
    if (allDiscrepancies.length > 0) {
      console.log('\n=== DISCREPANCIES DETECTED ===');
      allDiscrepancies.slice(0, 20).forEach((d, idx) => {
        console.log(`\nDiscrepancy #${idx + 1}:`);
        console.log(`  Agent ID: ${d.agentId}`);
        console.log(`  Policy ID: ${d.policyId}`);
        console.log(`  Privilege: ${d.privilege}`);
        console.log(`  Original Result: ${d.original.response}`);
        console.log(`  Remote Result: ${d.remote.response}`);
      });
    }

    console.log('\n=== FINAL AGGREGATE RESULTS ===');
    console.log(JSON.stringify(finalResults, null, 2));

    return JSON.stringify(finalResults, null, 2);
  }

  @Mutation(() => ISpace, {
    description: 'Updates the Space.',
  })
  async updateSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceData') spaceData: UpdateSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceData.ID, {
      relations: {
        about: {
          profile: true,
        },
      },
    });
    const sentAt = performance.now();
    try {
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.UPDATE,
        `update Space: ${space.id}`
      );
    } catch {
      // ...
    }
    const receivedAt = performance.now();
    const latency = receivedAt - sentAt;
    console.log(latency.toFixed(3), 'ms to authorize updateSpace mutation');

    const updatedSpace = await this.spaceService.update(spaceData);

    this.contributionReporter.spaceContentEdited(
      {
        id: updatedSpace.id,
        name: updatedSpace.about.profile.displayName,
        space: updatedSpace.id,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return updatedSpace;
  }

  @Mutation(() => ISpace, {
    description: 'Deletes the specified Space.',
  })
  async deleteSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(deleteData.ID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteSpace: ${space.nameID}`
    );
    return await this.spaceService.deleteSpaceOrFail(deleteData);
  }

  @Mutation(() => ISpace, {
    description: 'Updates one of the Setting on a Space',
  })
  async updateSpaceSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateSpaceSettingsInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(settingsData.spaceID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `space settings update: ${space.id}`
    );

    const shouldUpdateAuthorization =
      await this.spaceService.shouldUpdateAuthorizationPolicy(
        space.id,
        settingsData.settings
      );

    space = await this.spaceService.updateSettings(
      space.id,
      settingsData.settings
    );
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset
    // but not all settings will require this, so only update if necessary
    if (shouldUpdateAuthorization) {
      const updatedAuthorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    }

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => ISpace, {
    description:
      'Update the platform settings, such as nameID, of the specified Space.',
  })
  async updateSpacePlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(updateData.spaceID, {
      relations: { about: { profile: true } },
    });
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on space: ${space.id}`
    );

    space = await this.spaceService.updateSpacePlatformSettings(
      space,
      updateData
    );

    space = await this.spaceService.save(space);
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => ISpace, {
    description: 'Creates a new Subspace within the specified Space.',
  })
  async createSubspace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('subspaceData') subspaceData: CreateSubspaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(subspaceData.spaceID, {
      relations: {},
    });
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.CREATE_SUBSPACE,
      `subspace create in: ${space.id}`
    );

    const subspace = await this.spaceService.createSubspace(
      subspaceData,
      agentInfo
    );
    // Save here so can reuse it later without another load
    const displayName = subspace.about.profile.displayName;
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        subspace.id,
        space.authorization // Important, and will be stored
      );

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    this.activityAdapter.subspaceCreated({
      triggeredBy: agentInfo.userID,
      subspace,
    });

    this.contributionReporter.subspaceCreated(
      {
        id: subspace.id,
        name: displayName,
        space: space.id, //TODO: should this be a root space ID?
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    const level0Space = await this.spaceService.getSpaceOrFail(
      subspace.levelZeroSpaceID,
      {
        relations: { agent: { credentials: true } },
      }
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      subspace.id,
      level0Space.agent
    );
    await this.licenseService.saveAll(updatedLicenses);

    const newSubspace = await this.spaceService.getSpaceOrFail(subspace.id);

    const subspaceCreatedEvent: SubspaceCreatedPayload = {
      eventID: `space-challenge-created-${Math.round(Math.random() * 100)}`,
      spaceID: space.id,
      subspace: newSubspace,
    };
    this.subspaceCreatedSubscription.publish(
      SubscriptionType.SUBSPACE_CREATED,
      subspaceCreatedEvent
    );

    return newSubspace;
  }
}
