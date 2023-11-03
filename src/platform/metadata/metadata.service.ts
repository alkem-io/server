import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { SpaceService } from '@domain/challenge/space/space.service';
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
    private spaceService: SpaceService,
    private challengeService: ChallengeService,
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getMetadata(): Promise<IMetadata> {
    return {
      services: await this.getServicesMetadata(),
      metrics: await this.getMetrics(),
    };
  }

  async getServicesMetadata(): Promise<IServiceMetadata[]> {
    const alkemioServerMetadata = await this.getAlkemioServerMetadata();
    const servicesMetadata = [alkemioServerMetadata];
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

  async getMetrics(): Promise<INVP[]> {
    const metrics: INVP[] = [];

    // Challenges
    const spacesCount = await this.spaceService.getSpaceCount();
    const spacesTopic = new NVP('spaces', spacesCount.toString());
    spacesTopic.id = 'spaces';
    metrics.push(spacesTopic);

    const challengesCount = await this.challengeService.getChallengesCount();
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = 'challenges';
    metrics.push(challengesTopic);

    // Users
    const usersCount = await this.userService.getUserCount();
    const usersTopic = new NVP('users', usersCount.toString());
    usersTopic.id = 'users';
    metrics.push(usersTopic);

    // Organizations
    const organizationsCount =
      await this.organizationService.getOrganizationCount();
    const organizationsTopic = new NVP(
      'organizations',
      organizationsCount.toString()
    );
    organizationsTopic.id = 'organizations';
    metrics.push(organizationsTopic);

    return metrics;
  }
}
