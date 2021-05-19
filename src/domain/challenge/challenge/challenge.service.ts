import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import validator from 'validator';
import {
  UpdateChallengeInput,
  Challenge,
  IChallenge,
  CreateChallengeInput,
  DeleteChallengeInput,
  AssignChallengeLeadInput,
  RemoveChallengeLeadInput,
} from '@domain/challenge/challenge';
import { ILifecycle } from '@domain/common/lifecycle';
import { IContext } from '@domain/context/context';
import { INVP, NVP } from '@domain/common/nvp';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { CreateOpportunityInput, IOpportunity } from '@domain/collaboration';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { IBaseChallenge } from '@domain/challenge/base-challenge';

@Injectable()
export class ChallengeService {
  constructor(
    private communityService: CommunityService,
    private opportunityService: OpportunityService,
    private challengeBaseService: BaseChallengeService,
    private organisationService: OrganisationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createChallenge(
    challengeData: CreateChallengeInput,
    ecoverseID: string
  ): Promise<IChallenge> {
    const challenge: IChallenge = Challenge.create(challengeData);
    challenge.ecoverseID = ecoverseID;
    challenge.childChallenges = [];
    challenge.opportunities = [];
    await this.challengeBaseService.initialise(
      challenge,
      challengeData,
      this.challengeRepository
    );

    return await this.challengeRepository.save(challenge);
  }

  async updateChallenge(
    challengeData: UpdateChallengeInput
  ): Promise<IChallenge> {
    return await this.challengeBaseService.update(
      challengeData,
      this.challengeRepository
    );
  }

  async deleteChallenge(deleteData: DeleteChallengeInput): Promise<IChallenge> {
    const challengeID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeByIdOrFail(parseInt(challengeID), {
      relations: [
        'childChallenges',
        'community',
        'context',
        'lifecycle',
        'opportunities',
      ],
    });

    await this.challengeBaseService.deleteEntities(challenge);

    // Do not remove a challenge that has child challenges , require these to be individually first removed
    if (challenge.childChallenges && challenge.childChallenges.length > 0)
      throw new ValidationException(
        `Unable to remove challenge (${challengeID}) as it contains ${challenge.childChallenges.length} child challenges`,
        LogContext.CHALLENGES
      );

    if (challenge.opportunities && challenge.opportunities.length > 0)
      throw new ValidationException(
        `Unable to remove challenge (${challengeID}) as it contains ${challenge.opportunities.length} opportunities`,
        LogContext.CHALLENGES
      );
    const { id } = challenge;
    const result = await this.challengeRepository.remove(
      challenge as Challenge
    );
    return {
      ...result,
      id,
    };
  }

  async getCommunity(challengeId: number): Promise<ICommunity> {
    return await this.challengeBaseService.getCommunity(
      challengeId,
      this.challengeRepository
    );
  }

  async getLifecycle(challengeId: number): Promise<ILifecycle> {
    return await this.challengeBaseService.getLifecycle(
      challengeId,
      this.challengeRepository
    );
  }

  async getContext(challengeId: number): Promise<IContext> {
    return await this.challengeBaseService.getContext(
      challengeId,
      this.challengeRepository
    );
  }

  async getOpportunities(challengeId: number): Promise<IOpportunity[]> {
    const challenge = await this.getChallengeByIdOrFail(challengeId, {
      relations: ['opportunities'],
    });
    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load Opportunities for challenge ${challengeId} `,
        LogContext.COLLABORATION
      );
    return opportunities;
  }

  // Loads the challenges into the challenge entity if not already present
  async getChildChallenges(challenge: IChallenge): Promise<IChallenge[]> {
    if (challenge.childChallenges && challenge.childChallenges.length > 0) {
      // challenge already has groups loaded
      return challenge.childChallenges;
    }

    const challengeWithChildChallenges = await this.getChallengeByIdOrFail(
      challenge.id,
      {
        relations: ['childChallenges'],
      }
    );
    const childChallenges = challengeWithChildChallenges.childChallenges;
    if (!childChallenges)
      throw new RelationshipNotFoundException(
        `Unable to load child challenges for challenge ${challenge.id} `,
        LogContext.CHALLENGES
      );

    return childChallenges;
  }

  async createChildChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    // First find the Challenge

    this.logger.verbose?.(
      `Adding child Challenge to Challenge (${challengeData.parentID})`,
      LogContext.CHALLENGES
    );
    // Try to find the challenge
    const challenge = await this.getChallengeOrFail(challengeData.parentID, {
      relations: ['childChallenges', 'community'],
    });

    await this.validateChildChallenge(challenge, challengeData);

    const childChallenge = await this.createChallenge(
      challengeData,
      challenge.ecoverseID
    );

    challenge.childChallenges?.push(childChallenge);

    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      childChallenge.community,
      challenge.community
    );

    await this.challengeRepository.save(challenge);

    return childChallenge;
  }

  async validateChildChallenge(
    challenge: IChallenge,
    challengeData: CreateChallengeInput
  ) {
    const childChallenges = challenge.childChallenges;
    if (!childChallenges)
      throw new EntityNotInitializedException(
        `Challenge without initialised child challenges encountered ${challenge.id}`,
        LogContext.CHALLENGES
      );

    this.checkForExistingEntityName(childChallenges, challengeData.name);
    this.checkForExistingEntityTextID(childChallenges, challengeData.textID);
  }

  async createOpportunity(
    opportunityData: CreateOpportunityInput
  ): Promise<IOpportunity> {
    this.logger.verbose?.(
      `Adding Opportunity to Challenge (${opportunityData.parentID})`,
      LogContext.CHALLENGES
    );

    const challenge = await this.getChallengeOrFail(opportunityData.parentID, {
      relations: ['opportunities', 'community'],
    });

    await this.validateOpportunity(challenge, opportunityData);

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData,
      challenge.ecoverseID
    );

    challenge.opportunities?.push(opportunity);

    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      opportunity.community,
      challenge.community
    );

    await this.challengeRepository.save(challenge);

    return opportunity;
  }

  async validateOpportunity(
    challenge: IChallenge,
    opportunityData: CreateOpportunityInput
  ) {
    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new EntityNotInitializedException(
        `Challenge without initialised opportunities encountered ${challenge.id}`,
        LogContext.CHALLENGES
      );

    this.checkForExistingEntityName(opportunities, opportunityData.name);
    this.checkForExistingEntityTextID(opportunities, opportunityData.textID);
  }

  checkForExistingEntityName(existingChildren: IBaseChallenge[], name: string) {
    const existingChild = existingChildren.find(child => child.name === name);
    if (existingChild)
      throw new ValidationException(
        `Trying to create a child but one with the given name already exists: ${name}`,
        LogContext.CHALLENGES
      );
  }

  checkForExistingEntityTextID(
    existingChildren: IBaseChallenge[],
    textID: string
  ) {
    const existingChild = existingChildren.find(
      child => child.textID === textID
    );
    if (existingChild)
      throw new ValidationException(
        `Trying to create a child but one with the given TextID already exists: ${textID}`,
        LogContext.CHALLENGES
      );
  }

  async getChallengeOrFail(
    challengeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge> {
    if (validator.isNumeric(challengeID)) {
      const idInt: number = parseInt(challengeID);
      return await this.getChallengeByIdOrFail(idInt, options);
    }

    return await this.getChallengeByTextIdOrFail(challengeID, options);
  }

  async getChallengeByIdOrFail(
    challengeID: number,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge> {
    const challenge = await this.challengeRepository.findOne(
      { id: challengeID },
      options
    );
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async getChallengeByTextIdOrFail(
    challengeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge> {
    const challenge = await this.challengeRepository.findOne(
      { textID: challengeID },
      options
    );
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async getChallenges(): Promise<Challenge[]> {
    const challenges = await this.challengeRepository.find();
    return challenges || [];
  }

  async assignChallengeLead(
    assignData: AssignChallengeLeadInput
  ): Promise<IChallenge> {
    const organisationID = assignData.organisationID;
    const challengeID = assignData.challengeID;
    const organisation = await this.organisationService.getOrganisationOrFail(
      organisationID,
      { relations: ['groups'] }
    );

    const challenge = await this.getChallengeOrFail(challengeID);

    const existingOrg = challenge.leadOrganisations?.find(
      existingOrg => existingOrg.id === organisation.id
    );
    if (existingOrg)
      throw new ValidationException(
        `Community ${challengeID} already has an organisation with the provided organisation ID: ${organisationID}`,
        LogContext.COMMUNITY
      );
    // ok to add the org
    challenge.leadOrganisations?.push(organisation);
    return await this.challengeRepository.save(challenge);
  }

  async removeChallengeLead(
    removeData: RemoveChallengeLeadInput
  ): Promise<IChallenge> {
    const challenge = await this.getChallengeOrFail(removeData.challengeID);
    const organisation = await this.organisationService.getOrganisationOrFail(
      removeData.organisationID
    );

    const existingOrg = challenge.leadOrganisations?.find(
      existingOrg => existingOrg.id === organisation.id
    );
    if (!existingOrg)
      throw new EntityNotInitializedException(
        `Community ${removeData.challengeID} does not have a lead with the provided organisation ID: ${removeData.organisationID}`,
        LogContext.COMMUNITY
      );
    // ok to add the org
    const updatedLeads = [];
    for (const existingOrg of challenge.leadOrganisations as IOrganisation[]) {
      if (existingOrg.id != organisation.id) {
        updatedLeads.push(existingOrg);
      }
    }
    challenge.leadOrganisations = updatedLeads;
    return await this.challengeRepository.save(challenge);
  }

  async getAllChallengesCount(ecoverseID: number): Promise<number> {
    const count = await this.challengeRepository.count({
      where: { ecoverseID: ecoverseID },
    });
    return count;
  }

  async getChildChallengesCount(challengeID: number): Promise<number> {
    return await this.challengeRepository.count({
      where: { parentChallenge: challengeID },
    });
  }

  async getMembersCount(challenge: IChallenge): Promise<number> {
    const community = await this.getCommunity(challenge.id);
    return await this.communityService.getMembersCount(community);
  }

  async getActivity(challenge: IChallenge): Promise<INVP[]> {
    const activity: INVP[] = [];
    const community = await this.getCommunity(challenge.id);

    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    activity.push(membersTopic);

    const challengesCount = await this.getChildChallengesCount(challenge.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    activity.push(challengesTopic);

    return activity;
  }
}
