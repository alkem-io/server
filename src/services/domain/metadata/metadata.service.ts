import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { HubService } from '@domain/challenge/hub/hub.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { INVP, NVP } from '@domain/common/nvp';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMetadata } from './metadata.interface';
import { IServiceMetadata } from './service/service.metadata.interface';

@Injectable()
export class MetadataService {
  constructor(
    private userService: UserService,
    private hubService: HubService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getMetadata(): Promise<IMetadata> {
    return {
      services: await this.getServicesMetadata(),
      activity: await this.getActivity(),
    };
  }

  async getServicesMetadata(): Promise<IServiceMetadata[]> {
    const ctServerMetadata = await this.getAlkemioServerMetadata();
    const servicesMetadata = [ctServerMetadata];
    return servicesMetadata;
  }

  async getAlkemioServerMetadata(): Promise<IServiceMetadata> {
    return {
      name: 'alkemio-server',
      version: await this.getVersion(),
    };
  }

  async getVersion(): Promise<string> {
    return process.env.npm_package_version ?? '';
  }

  async getActivity(): Promise<INVP[]> {
    const activity: INVP[] = [];

    // Challenges
    const hubsCount = await this.hubService.getHubCount();
    const hubsTopic = new NVP('hubs', hubsCount.toString());
    hubsTopic.id = 'hubs';
    activity.push(hubsTopic);

    const challengesCount = await this.challengeService.getChallengeCount();
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = 'challenges';
    activity.push(challengesTopic);

    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesCount();
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = 'opportunities';
    activity.push(opportunitiesTopic);

    // Users
    const usersCount = await this.userService.getUserCount();
    const usersTopic = new NVP('users', usersCount.toString());
    usersTopic.id = 'users';
    activity.push(usersTopic);

    // Organizations
    const organizationsCount =
      await this.organizationService.getOrganizationCount();
    const organizationsTopic = new NVP(
      'organizations',
      organizationsCount.toString()
    );
    organizationsTopic.id = 'organizations';
    activity.push(organizationsTopic);

    return activity;
  }
}
