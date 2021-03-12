import { Context } from '@domain/context/context/context.entity';
import { ContextService } from '@domain/context/context/context.service';
import { OpportunityInput } from '@domain/challenge/opportunity/opportunity.dto';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { RestrictedGroupNames } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
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
import { ChallengeInput } from './challenge.dto';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';
import { UpdateChallengeInput } from './update-challenge.dto';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';

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
      challenge.tagset = this.tagsetService.createTagset({});
    }

    if (!challenge.context) {
      challenge.context = new Context();
    }

    if (!challenge.community) {
      challenge.community = new Community(challenge.name, [
        RestrictedGroupNames.Members,
      ]);
    }

    // Initialise contained objects
    this.contextService.initialiseMembers(challenge.context);
    this.communityService.initialiseMembers(challenge.community);

    return challenge;
  }

  // Loads the challenges into the challenge entity if not already present
  async loadCommunity(challengeId: number): Promise<ICommunity> {
    const challengeWithCommunity = await this.getChallengeOrFail(challengeId, {
      relations: ['community'],
    });
    const community = challengeWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for challenge ${challengeId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  // Loads the challenges into the challenge entity if not already present
  async loadOpportunities(challenge: Challenge): Promise<IOpportunity[]> {
    if (challenge.opportunities && challenge.opportunities.length > 0) {
      // challenge already has groups loaded
      return challenge.opportunities;
    }

    const challengeWithOpportunities = await this.getChallengeOrFail(
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
    challengeID: number,
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    // First find the Challenge

    this.logger.verbose?.(
      `Adding opportunity to challenge (${challengeID})`,
      LogContext.CHALLENGES
    );
    // Try to find the challenge
    const challenge = await this.getChallengeOrFail(challengeID, {
      relations: ['opportunities'],
    });

    await this.validateOpportunity(challenge, opportunityData);

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData
    );

    challenge.opportunities?.push(opportunity as Opportunity);
    await this.challengeRepository.save(challenge);

    return opportunity;
  }

  async validateOpportunity(
    challenge: IChallenge,
    opportunityData: OpportunityInput
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

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    await this.validateChallenge(challengeData);

    const textID = challengeData.textID;
    // Ensure lower case
    challengeData.textID = textID?.toLowerCase();
    // reate and initialise a new challenge using the first returned array item
    const challenge = Challenge.create(challengeData);
    await this.initialiseMembers(challenge);
    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async validateChallenge(challengeData: ChallengeInput) {
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

  async removeChallenge(challengeID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeOrFail(challengeID, {
      relations: ['opportunities', 'groups'],
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

    await this.challengeRepository.remove(challenge as Challenge);
    return true;
  }

  async addUserToOpportunity(
    userID: number,
    opportunityID: number
  ): Promise<IUserGroup> {
    // Get the ID of the challenge containing the provided opportunity ID
    const challengeID = await this.opportunityService.getChallengeID(
      opportunityID
    );
    const isMember = true; //await this.community.isUserMember(userID, challengeID);
    if (!isMember)
      throw new ValidationException(
        `User (${userID}) is not a member of parent challenge: ${challengeID}`,
        LogContext.CHALLENGES
      );

    // Get the members group
    const community = await this.opportunityService.loadCommunity(
      opportunityID
    );
    return await this.communityService.addMember(userID, community.id);
  }

  async getChallenges(ecoverseId: number): Promise<Challenge[]> {
    const challenges = await this.challengeRepository.find({
      where: { ecoverse: { id: ecoverseId } },
    });
    return challenges || [];
  }

  async addChallengeLead(
    challengeID: number,
    organisationID: number
  ): Promise<boolean> {
    let challenge, organisation;
    // eslint-disable-next-line prefer-const
    [challenge, organisation] = await this.getChallengeAndOrganisation(
      challengeID,
      organisationID
    );

    const existingOrg = challenge.leadOrganisations?.find(
      existingOrg => existingOrg.id === organisationID
    );
    if (existingOrg)
      throw new ValidationException(
        `Community ${challengeID} already has an organisation with the provided organisation ID: ${organisationID}`,
        LogContext.COMMUNITY
      );
    // ok to add the org
    challenge.leadOrganisations?.push(organisation);
    await this.challengeRepository.save(challenge);
    return true;
  }

  async getChallengeAndOrganisation(
    challengeID: number,
    organisationID: number
  ): Promise<[IChallenge, IOrganisation]> {
    const organisation = await this.organisationService.getOrganisationOrFail(
      organisationID,
      { relations: ['groups'] }
    );

    const challenge = await this.getChallengeOrFail(challengeID);

    // Check the org is not already added
    if (!challenge.leadOrganisations)
      throw new EntityNotInitializedException(
        `Challenge not fully initialised: ${challengeID}`,
        LogContext.CHALLENGES
      );

    return [challenge, organisation];
  }

  async removeChallengeLead(
    challengeID: number,
    organisationID: number
  ): Promise<boolean> {
    let challenge;
    // eslint-disable-next-line prefer-const
    [challenge, {}] = await this.getChallengeAndOrganisation(
      challengeID,
      organisationID
    );

    const existingOrg = challenge.leadOrganisations?.find(
      existingOrg => existingOrg.id === organisationID
    );
    if (!existingOrg)
      throw new EntityNotInitializedException(
        `Community ${challengeID} does not have a lead with the provided organisation ID: ${organisationID}`,
        LogContext.COMMUNITY
      );
    // ok to add the org
    const updatedLeads = [];
    for (const existingOrg of challenge.leadOrganisations as IOrganisation[]) {
      if (existingOrg.id != organisationID) {
        updatedLeads.push(existingOrg);
      }
    }
    challenge.leadOrganisations = updatedLeads;
    await this.challengeRepository.save(challenge);
    return true;
  }
}
