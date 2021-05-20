import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IBaseChallenge, UpdateBaseChallengeInput } from '@domain/challenge';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { IContext } from '@domain/context/context';
import { ContextService } from '@domain/context/context/context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { BaseChallenge } from './base.challenge.entity';
import validator from 'validator';
import { CreateBaseChallengeInput } from './base.challenge.dto.create';
import { IIdentifiable } from '@domain/common/identifiable-entity';

@Injectable()
export class BaseChallengeService {
  constructor(
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
    private lifecycleService: LifecycleService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async initialise(
    challengeBase: IBaseChallenge,
    challengeData: CreateBaseChallengeInput
  ) {
    challengeBase.community = await this.communityService.createCommunity(
      challengeBase.name
    );
    challengeBase.community.ecoverseID = challengeBase.ecoverseID;

    if (!challengeData.context) {
      challengeBase.context = await this.contextService.createContext({});
    } else {
      challengeBase.context = await this.contextService.createContext(
        challengeData.context
      );
    }

    challengeBase.tagset = this.tagsetService.createDefaultTagset();
  }

  async update(
    challengeBaseData: UpdateBaseChallengeInput,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const challenge = await this.getChallengeBaseOrFail(
      challengeBaseData.ID,
      repository,
      {
        relations: ['context'],
      }
    );

    if (challengeBaseData.context) {
      if (!challenge.context)
        throw new EntityNotInitializedException(
          `Challenge not initialised: ${challengeBaseData.ID}`,
          LogContext.CHALLENGES
        );
      challenge.context = await this.contextService.updateContext(
        challenge.context,
        challengeBaseData.context
      );
    }
    if (challengeBaseData.tags)
      this.tagsetService.replaceTagsOnEntity(
        challenge as BaseChallenge,
        challengeBaseData.tags
      );

    return await repository.save(challenge);
  }

  async deleteEntities(challengeBase: IBaseChallenge) {
    if (challengeBase.context) {
      await this.contextService.removeContext(challengeBase.context.id);
    }

    if (challengeBase.community) {
      await this.communityService.removeCommunity(challengeBase.community.id);
    }

    if (challengeBase.lifecycle) {
      await this.lifecycleService.deleteLifecycle(challengeBase.lifecycle.id);
    }

    if (challengeBase.tagset) {
      await this.tagsetService.removeTagset({
        ID: challengeBase.tagset.id.toString(),
      });
    }
  }

  async getChallengeBaseOrFail(
    challengeID: string,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    if (validator.isNumeric(challengeID)) {
      const idInt: number = parseInt(challengeID);
      return await this.getChallengeBaseByIdOrFail(idInt, repository, options);
    }

    return await this.getChallengeByTextIdOrFail(
      challengeID,
      repository,
      options
    );
  }

  async getChallengeBaseByIdOrFail(
    challengeBaseID: number,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const challenge = await repository.findOne(
      { id: challengeBaseID },
      options
    );
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeBaseID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async getChallengeByTextIdOrFail(
    challengeID: string,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const challenge = await repository.findOne(
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

  checkForIdentifiableNameDuplication(
    existingChildren: IIdentifiable[],
    name: string
  ) {
    const existingChildName = existingChildren.find(
      child => child.name === name
    );
    if (existingChildName)
      throw new ValidationException(
        `Unable to create entity: parent already has a child with the given name: ${name}`,
        LogContext.CHALLENGES
      );
  }

  checkForIdentifiableTextIdDuplication(
    existingChildren: IIdentifiable[],
    textID: string
  ) {
    const existingChildTextId = existingChildren.find(
      child => child.textID === textID
    );
    if (existingChildTextId)
      throw new ValidationException(
        `Unable to create entity: parent already has a child with the given textID: ${textID}`,
        LogContext.CHALLENGES
      );
  }

  async getCommunity(
    challengeBaseId: number,
    repository: Repository<BaseChallenge>
  ): Promise<ICommunity> {
    const challengeWithCommunity = await this.getChallengeBaseByIdOrFail(
      challengeBaseId,
      repository,
      {
        relations: ['community'],
      }
    );
    const community = challengeWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for challenge ${challengeBaseId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  async getContext(
    challengeId: number,
    repository: Repository<BaseChallenge>
  ): Promise<IContext> {
    const challengeWithContext = await this.getChallengeBaseByIdOrFail(
      challengeId,
      repository,
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

  async getLifecycle(
    challengeId: number,
    repository: Repository<BaseChallenge>
  ): Promise<ILifecycle> {
    const challenge = await this.getChallengeBaseByIdOrFail(
      challengeId,
      repository,
      {
        relations: ['lifecycle'],
      }
    );

    if (!challenge.lifecycle) {
      throw new RelationshipNotFoundException(
        `Unable to load Lifeycle for challenge ${challengeId} `,
        LogContext.CHALLENGES
      );
    }

    return challenge.lifecycle;
  }
}
