import { Context } from '@domain/context/context/context.entity';
import { ContextService } from '@domain/context/context/context.service';
import {
  Opportunity,
  IOpportunity,
  CreateOpportunityInput,
} from '@domain/challenge/opportunity';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
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
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { AuthorizationRoles } from '@core/authorization';
import { CommunityType } from '@common/enums/community.types';
import validator from 'validator';
import {
  UpdateChallengeInput,
  Challenge,
  IChallenge,
  CreateChallengeInput,
} from '@domain/challenge/challenge';
import { DeleteChallengeInput } from './challenge.dto.delete';
import { AssignChallengeLeadInput } from './challenge.dto.assign.lead';
import { RemoveChallengeLeadInput } from './challenge.dto.remove.lead';

@Injectable()
export class ChallengeService {
  constructor(
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
    private opportunityService: OpportunityService,
    private organisationService: OrganisationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async initialiseMembers(challenge: IChallenge): Promise<IChallenge> {
    if (!challenge.opportunities) {
      challenge.opportunities = [];
    }
    if (!challenge.tagset) {
      challenge.tagset = this.tagsetService.createDefaultTagset();
    }

    if (!challenge.context) {
      challenge.context = new Context();
    }

    if (!challenge.community) {
      challenge.community = new Community(
        challenge.name,
        CommunityType.CHALLENGE,
        [AuthorizationRoles.Members]
      );
    }

    // Initialise contained objects
    this.contextService.initialiseMembers(challenge.context);
    this.communityService.initialiseMembers(challenge.community);

    return challenge;
  }

  // Loads the challenges into the challenge entity if not already present
  async getCommunity(challengeId: number): Promise<ICommunity> {
    const challengeWithCommunity = await this.getChallengeByIdOrFail(
      challengeId,
      {
        relations: ['community'],
      }
    );
    const community = challengeWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for challenge ${challengeId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  // Loads the challenges into the challenge entity if not already present
  async getOpportunities(challenge: Challenge): Promise<IOpportunity[]> {
    if (challenge.opportunities && challenge.opportunities.length > 0) {
      // challenge already has groups loaded
      return challenge.opportunities;
    }

    const challengeWithOpportunities = await this.getChallengeByIdOrFail(
      challenge.id,
      {
        relations: ['opportunities'],
      }
    );
    if (!challengeWithOpportunities.opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load opportunities for challenge ${challenge.id} `,
        LogContext.CHALLENGES
      );

    return challengeWithOpportunities.opportunities;
  }

  async createOpportunity(
    opportunityData: CreateOpportunityInput
  ): Promise<IOpportunity> {
    // First find the Challenge

    this.logger.verbose?.(
      `Adding opportunity to challenge (${opportunityData.parentID})`,
      LogContext.CHALLENGES
    );
    // Try to find the challenge
    const challenge = await this.getChallengeOrFail(opportunityData.parentID, {
      relations: ['opportunities', 'community'],
    });

    await this.validateOpportunity(challenge, opportunityData);

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData
    );

    challenge.opportunities?.push(opportunity as Opportunity);

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
        `Challenge without initialised Opportunities encountered ${challenge.id}`,
        LogContext.CHALLENGES
      );

    let opportunity = opportunities.find(
      opportunity => opportunity.name === opportunityData.name
    );

    if (opportunity)
      throw new ValidationException(
        `Opportunity with name: ${opportunityData.name} already exists!`,
        LogContext.OPPORTUNITY
      );

    opportunity = opportunities.find(
      opportunity => opportunity.textID === opportunityData.textID
    );
    // check if the opportunity already exists with the textID
    if (opportunity)
      throw new ValidationException(
        `Trying to create an opportunity but one with the given textID already exists: ${opportunityData.textID}`,
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

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    await this.validateChallengeData(challengeData);

    const textID = challengeData.textID;
    // Ensure lower case
    challengeData.textID = textID?.toLowerCase();
    // reate and initialise a new challenge using the first returned array item
    const challenge = Challenge.create(challengeData);
    await this.initialiseMembers(challenge);
    const savedChallenge = await this.challengeRepository.save(challenge);

    return savedChallenge;
  }

  async validateChallengeData(challengeData: CreateChallengeInput) {
    const textID = challengeData.textID;
    if (!textID || textID.length < 3)
      throw new ValidationException(
        `Required field textID not specified or long enough: ${textID}`,
        LogContext.CHALLENGES
      );
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(textID);
    if (!textIdCheck)
      throw new ValidationException(
        `Required field textID provided not in the correct format: ${textID}`,
        LogContext.CHALLENGES
      );

    const challenge = await this.challengeRepository.findOne({
      where: { textID: challengeData.textID },
    });
    if (challenge)
      throw new ValidationException(
        `Challenge with the textID: ${challengeData.textID} already exists!`,
        LogContext.CHALLENGES
      );
  }

  async updateChallenge(
    challengeData: UpdateChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.getChallengeOrFail(challengeData.ID);

    const newName = challengeData.name;
    if (newName) {
      if (!(newName === challenge.name)) {
        // challenge is being renamed...
        const otherChallenge = await this.challengeRepository.findOne({
          where: { name: newName },
        });
        // already have a challenge with the given name, not allowed
        if (otherChallenge)
          throw new ValidationException(
            `Unable to update challenge: already have a challenge with the provided name (${challengeData.name})`,
            LogContext.CHALLENGES
          );
        // Ok to rename
        challenge.name = newName;
      }
    }

    if (challengeData.state) {
      challenge.state = challengeData.state;
    }

    if (challengeData.context) {
      if (!challenge.context)
        throw new EntityNotInitializedException(
          `Challenge not initialised: ${challengeData.ID}`,
          LogContext.CHALLENGES
        );
      await this.contextService.update(
        challenge.context,
        challengeData.context
      );
    }
    if (challengeData.tags)
      this.tagsetService.replaceTagsOnEntity(
        challenge as Challenge,
        challengeData.tags
      );

    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async deleteChallenge(deleteData: DeleteChallengeInput): Promise<IChallenge> {
    const challengeID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeByIdOrFail(challengeID, {
      relations: ['opportunities', 'community'],
    });

    // Do not remove a challenge that has opporutnities, require these to be individually first removed
    if (challenge.opportunities && challenge.opportunities.length > 0)
      throw new ValidationException(
        `Unable to remove challenge (${challengeID}) as it contains ${challenge.opportunities.length} opportunities`,
        LogContext.CHALLENGES
      );

    // Remove the community
    if (challenge.community) {
      await this.communityService.removeCommunity(challenge.community.id);
    }

    // Remove the context
    if (challenge.context) {
      await this.contextService.removeContext(challenge.context.id);
    }

    if (challenge.tagset) {
      await this.tagsetService.removeTagset({ ID: challenge.tagset.id });
    }

    const { id } = challenge;
    const result = await this.challengeRepository.remove(
      challenge as Challenge
    );
    return {
      ...result,
      id,
    };
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
}
