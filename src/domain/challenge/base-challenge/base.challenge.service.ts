import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { UpdateBaseChallengeInput } from '@domain/challenge';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { IContext } from '@domain/context/context';
import { ContextService } from '@domain/context/context/context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { BaseChallenge } from './base.challenge.entity';
import { CreateBaseChallengeInput } from './base.challenge.dto.create';
import { INameable } from '@domain/common/nameable-entity';
import { IBaseChallenge } from './base.challenge.interface';

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
      challengeBase.displayName
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
    return await this.getChallengeBaseByIdOrFail(
      challengeID,
      repository,
      options
    );
  }

  async getChallengeBaseByIdOrFail(
    challengeBaseID: string,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const conditions: FindConditions<BaseChallenge> = {
      id: challengeBaseID,
      //textID: challengeBaseID,
    };

    const challenge = await repository.findOne(conditions, options);
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
      { nameID: challengeID },
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
    existingChildren: INameable[],
    name: string
  ) {
    const existingChildName = existingChildren.find(
      child => child.displayName === name
    );
    if (existingChildName)
      throw new ValidationException(
        `Unable to create entity: parent already has a child with the given name: ${name}`,
        LogContext.CHALLENGES
      );
  }

  checkForIdentifiableTextIdDuplication(
    existingChildren: INameable[],
    textID: string
  ) {
    const existingChildTextId = existingChildren.find(
      child => child.nameID === textID
    );
    if (existingChildTextId)
      throw new ValidationException(
        `Unable to create entity: parent already has a child with the given textID: ${textID}`,
        LogContext.CHALLENGES
      );
  }

  async getCommunity(
    challengeBaseId: string,
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
    challengeId: string,
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
    challengeId: string,
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
