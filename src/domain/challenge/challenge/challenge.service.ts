import { ContextService } from '@domain/context/context/context.service';
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
  challengeLifecycleConfigDefault,
  challengeLifecycleConfigExtended,
} from '@domain/challenge/challenge';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ChallengeLifecycleTemplates } from '@common/enums/challenge.lifecycle.templates';
import { IContext } from '@domain/context/context';
import { ICollaboration } from '@domain/collaboration/collaboration';

@Injectable()
export class ChallengeService {
  constructor(
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
    private lifecycleService: LifecycleService,
    private organisationService: OrganisationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const challenge: IChallenge = Challenge.create(challengeData);
    challenge.childChallenges = [];

    // Community
    challenge.community = await this.communityService.createCommunity(
      challenge.name
    );

    // Context
    if (!challengeData.context) {
      challengeData.context = {};
    } else {
      challenge.context = await this.contextService.createContext(
        challengeData.context
      );
    }

    // Remaining initialisation
    challenge.tagset = this.tagsetService.createDefaultTagset();

    // Lifecycle, that has both a default and extended version
    let machineConfig: any = challengeLifecycleConfigDefault;
    if (
      challengeData.lifecycleTemplate &&
      challengeData.lifecycleTemplate === ChallengeLifecycleTemplates.EXTENDED
    ) {
      machineConfig = challengeLifecycleConfigExtended;
    }

    await this.challengeRepository.save(challenge);

    challenge.lifecycle = await this.lifecycleService.createLifecycle(
      challenge.id.toString(),
      machineConfig
    );

    return await this.challengeRepository.save(challenge);
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

    if (challengeData.context) {
      if (!challenge.context)
        throw new EntityNotInitializedException(
          `Challenge not initialised: ${challengeData.ID}`,
          LogContext.CHALLENGES
        );
      challenge.context = await this.contextService.updateContext(
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
      relations: ['childChallenges', 'community', 'lifecycle'],
    });

    // Do not remove a challenge that has opporutnities, require these to be individually first removed
    if (challenge.childChallenges && challenge.childChallenges.length > 0)
      throw new ValidationException(
        `Unable to remove challenge (${challengeID}) as it contains ${challenge.childChallenges.length} opportunities`,
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

    // Remove the lifecycle
    if (challenge.lifecycle) {
      await this.lifecycleService.deleteLifecycle(challenge.lifecycle.id);
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

  async getContext(challengeId: number): Promise<IContext> {
    const challengeWithContext = await this.getChallengeByIdOrFail(
      challengeId,
      {
        relations: ['context'],
      }
    );
    const context = challengeWithContext.context;
    if (!context)
      throw new RelationshipNotFoundException(
        `Unable to load context for challenge ${challengeId} `,
        LogContext.CONTEXT
      );
    return context;
  }

  async getCollaboration(challengeId: number): Promise<ICollaboration> {
    const challenge = await this.getChallengeByIdOrFail(challengeId, {
      relations: ['collaboration'],
    });
    const collaboration = challenge.collaboration;
    if (!collaboration)
      throw new RelationshipNotFoundException(
        `Unable to load Collaboration for challenge ${challengeId} `,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  // Lazy load the lifecycle
  async getLifecycle(challengeId: number): Promise<ILifecycle> {
    const challenge = await this.getChallengeByIdOrFail(challengeId, {
      relations: ['lifecycle'],
    });

    // if no lifecycle then create + save...
    if (!challenge.lifecycle) {
      challenge.lifecycle = await this.lifecycleService.createLifecycle(
        challengeId.toString(),
        challengeLifecycleConfigDefault
      );
      await this.challengeRepository.save(challenge);
    }

    return challenge.lifecycle;
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
    const challenge = await this.getChallengeByIdOrFail(
      challengeData.parentID,
      {
        relations: ['childChallenges', 'community'],
      }
    );

    await this.validateChildChallenge(challenge, challengeData);

    const childChallenge = await this.createChallenge(challengeData);

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

    let childChallenge = childChallenges.find(
      childChallenge => childChallenge.name === challengeData.name
    );

    if (childChallenge)
      throw new ValidationException(
        `Child Challenge with name: ${challengeData.name} already exists!`,
        LogContext.CHALLENGES
      );

    childChallenge = childChallenges.find(
      childChallenge => childChallenge.textID === challengeData.textID
    );
    // check if the opportunity already exists with the textID
    if (childChallenge)
      throw new ValidationException(
        `Trying to create an child challenge but one with the given textID already exists: ${challengeData.textID}`,
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
}
