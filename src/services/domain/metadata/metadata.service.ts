import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { INVP, NVP } from '@domain/common/nvp';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMetadata } from './metadata.interface';
import { IServiceMetadata } from './service/service.metadata.interface';

@Injectable()
export class MetadataService {
  constructor(
    private userService: UserService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private organisationService: OrganisationService,
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
    const ecoversesCount = await this.ecoverseService.getEcoverseCount();
    const ecoversesTopic = new NVP('ecoverses', ecoversesCount.toString());
    ecoversesTopic.id = 'ecoverses';
    activity.push(ecoversesTopic);

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

    // Organisations
    const organisationsCount =
      await this.organisationService.getOrganisationCount();
    const organisationsTopic = new NVP(
      'organisations',
      organisationsCount.toString()
    );
    organisationsTopic.id = 'organisations';
    activity.push(organisationsTopic);

    return activity;
  }
}
