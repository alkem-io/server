import { IChallenge, CreateChallengeInput } from '@domain/challenge/challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import {
  Ecoverse,
  IEcoverse,
  CreateEcoverseInput,
  UpdateEcoverseInput,
} from '@domain/challenge/ecoverse';
import { ICommunity } from '@domain/community/community';
import { IUserGroup } from '@domain/community/user-group';
import { INVP, NVP } from '@domain/common/nvp';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IProject } from '@domain/collaboration/project';
import { IContext } from '@domain/context';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { BaseChallengeService } from '../base-challenge/base.challenge.service';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private projectService: ProjectService,
    private opportunityService: OpportunityService,
    private challengeBaseService: BaseChallengeService,
    private challengeService: ChallengeService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createEcoverse(ecoverseData: CreateEcoverseInput): Promise<IEcoverse> {
    const ecoverse: IEcoverse = Ecoverse.create(ecoverseData);
    await this.ecoverseRepository.save(ecoverse);
    ecoverse.challenge = await this.challengeService.createChallenge(
      {
        parentID: ecoverse.id.toString(),
        name: `ecoverse-${ecoverseData.name}`,
        context: ecoverseData.context,
        textID: `ecoverse-${ecoverseData.textID}`,
        tags: ecoverseData.tags,
      },
      ecoverse.id.toString()
    );
    ecoverse.challenge.ecoverseID = ecoverse.id.toString();

    if (ecoverseData.hostID) {
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
    } else {
      ecoverse.host = await this.organisationService.createOrganisation({
        name: `host-org-${ecoverseData.textID}`,
        textID: `host-${ecoverseData.textID}`,
      });
    }
    return await this.ecoverseRepository.save(ecoverse);
  }

  async getEcoverseOrFail(
    ecoverseID: string,
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    return await this.getEcoverseByIdOrFail(ecoverseID, options);
  }

  async getEcoverseByIdOrFail(
    ecoverseID: string,
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    const conditions: FindConditions<Ecoverse> = {
      id: ecoverseID,
      //textID: ecoverseID,
    };
    const ecoverse = await this.ecoverseRepository.findOne(conditions, options);
    if (!ecoverse)
      throw new EntityNotFoundException(
        `Unable to find Ecoverse with ID: ${ecoverseID}`,
        LogContext.CHALLENGES
      );
    return ecoverse;
  }

  getChallenge(ecoverse: IEcoverse): IChallenge {
    const challenge = ecoverse.challenge;
    if (!challenge) {
      throw new EntityNotInitializedException(
        `Unable to find Ecoverse with ID: ${ecoverse.id}`,
        LogContext.CHALLENGES
      );
    }
    return challenge;
  }

  async getChallenges(ecoverse: IEcoverse): Promise<IChallenge[]> {
    const challenge = this.getChallenge(ecoverse);
    return await this.challengeService.getChildChallenges(challenge);
  }

  async getGroups(ecoverse: IEcoverse): Promise<IUserGroup[]> {
    const community = await this.getCommunity(ecoverse);
    return community.groups || [];
  }

  async getOpportunities(ecoverse: IEcoverse): Promise<IOpportunity[]> {
    const challenges = await this.getChallenges(ecoverse);
    const opportunities: IOpportunity[] = [];
    for (const challenge of challenges) {
      const childOpportunities = await this.challengeService.getOpportunities(
        challenge.id
      );
      for (const childOpportunity of childOpportunities) {
        const opportunity = await this.opportunityService.getOpportunityByIdOrFail(
          childOpportunity.id,
          {
            relations: ['context'],
          }
        );
        opportunities.push(opportunity);
      }
    }
    return opportunities;
  }

  async getCommunity(ecoverse: IEcoverse): Promise<ICommunity> {
    const challenge = this.getChallenge(ecoverse);
    return await this.challengeService.getCommunity(challenge.id);
  }

  async getContext(ecoverse: IEcoverse): Promise<IContext> {
    const challenge = this.getChallenge(ecoverse);
    return await this.challengeService.getContext(challenge.id);
  }

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.getEcoverseOrFail(challengeData.parentID);
    const challenges = await this.getChallenges(ecoverse);

    this.challengeBaseService.checkForIdentifiableNameDuplication(
      challenges,
      challengeData.name
    );
    this.challengeBaseService.checkForIdentifiableTextIdDuplication(
      challenges,
      challengeData.textID
    );

    // No existing challenge found, create and initialise a new one!
    const newChallenge = await this.challengeService.createChildChallenge(
      challengeData
    );
    await this.ecoverseRepository.save(ecoverse);

    return newChallenge;
  }

  async update(ecoverseData: UpdateEcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getEcoverseOrFail(ecoverseData.ID);
    const challenge = this.getChallenge(ecoverse);

    if (ecoverseData.hostID) {
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
    }

    ecoverse.challenge = await this.challengeService.updateChallenge({
      ID: challenge.id.toString(),
      name: ecoverseData.name,
      context: ecoverseData.context,
      tags: ecoverseData.tags,
    });

    return await this.ecoverseRepository.save(ecoverse);
  }

  async getDefaultEcoverseOrFail(
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    const ecoverseId = await this.getDefaultEcoverseId(); // todo - remove when can have multiple ecoverses
    return await this.getEcoverseByIdOrFail(ecoverseId, options);
  }

  async getDefaultEcoverseId(): Promise<string> {
    const ecoverse = await this.ecoverseRepository.findOne();
    if (!ecoverse) {
      throw new ValidationException(
        'Ecoverse is missing!',
        LogContext.BOOTSTRAP
      );
    }
    return ecoverse.id;
  }

  async getProjects(ecoverse: IEcoverse): Promise<IProject[]> {
    return await this.projectService.getProjects(ecoverse.id);
  }

  async getActivity(ecoverse: IEcoverse): Promise<INVP[]> {
    const challenge = this.getChallenge(ecoverse);
    // this will have members + challenges populated
    const activity: INVP[] = [];

    // Challenges
    const childChallengesCount = await this.challengeService.getChildChallengesCount(
      challenge.id
    );
    const challengesTopic = new NVP(
      'challenges',
      childChallengesCount.toString()
    );
    activity.push(challengesTopic);

    const allChallengesCount = await this.challengeService.getAllChallengesCount(
      ecoverse.id
    );
    const opportunitiesTopic = new NVP(
      'opportunities',
      (allChallengesCount - childChallengesCount - 1).toString()
    );
    activity.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsCount(
      ecoverse.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    activity.push(projectsTopic);

    // Members
    const membersCount = await this.challengeService.getMembersCount(challenge);
    const membersTopic = new NVP('members', membersCount.toString());
    activity.push(membersTopic);

    return activity;
  }
}
