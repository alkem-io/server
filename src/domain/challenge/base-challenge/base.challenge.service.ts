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
import { IBaseChallenge } from './base.challenge.interface';
import { NamingService } from '@src/services/naming/naming.service';

@Injectable()
export class BaseChallengeService {
  constructor(
    private contextService: ContextService,
    private communityService: CommunityService,
    private namingService: NamingService,
    private tagsetService: TagsetService,
    private lifecycleService: LifecycleService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async initialise(
    baseChallenge: IBaseChallenge,
    baseChallengeData: CreateBaseChallengeInput
  ) {
    await this.isNameAvailableOrFail(
      baseChallengeData.nameID,
      baseChallenge.nameableScopeID
    );
    baseChallenge.community = await this.communityService.createCommunity(
      baseChallenge.displayName
    );
    baseChallenge.community.ecoverseID = baseChallenge.ecoverseID;

    if (!baseChallengeData.context) {
      baseChallenge.context = await this.contextService.createContext({});
    } else {
      baseChallenge.context = await this.contextService.createContext(
        baseChallengeData.context
      );
    }

    baseChallenge.tagset = this.tagsetService.createDefaultTagset();
  }

  async update(
    baseChallengeData: UpdateBaseChallengeInput,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const baseChallenge = await this.getChallengeBaseOrFail(
      baseChallengeData.ID,
      repository,
      {
        relations: ['context'],
      }
    );

    if (baseChallengeData.context) {
      if (!baseChallenge.context)
        throw new EntityNotInitializedException(
          `Challenge not initialised: ${baseChallengeData.ID}`,
          LogContext.CHALLENGES
        );
      baseChallenge.context = await this.contextService.updateContext(
        baseChallenge.context,
        baseChallengeData.context
      );
    }
    if (baseChallengeData.tags)
      this.tagsetService.replaceTagsOnEntity(
        baseChallenge as BaseChallenge,
        baseChallengeData.tags
      );

    if (baseChallengeData.displayName)
      baseChallenge.displayName = baseChallengeData.displayName;

    return await repository.save(baseChallenge);
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
        ID: challengeBase.tagset.id,
      });
    }
  }

  async getChallengeBaseOrFail(
    challengeBaseID: string,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const conditions: FindConditions<BaseChallenge> = {
      id: challengeBaseID,
    };

    const challenge = await repository.findOne(conditions, options);
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeBaseID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async isNameAvailableOrFail(nameID: string, nameableScopeID: string) {
    if (
      !(await this.namingService.isEcoverseNameAvailable(
        nameID,
        nameableScopeID
      ))
    )
      throw new ValidationException(
        `Unable to create entity: the provided nameID is already taken: ${nameID}`,
        LogContext.CHALLENGES
      );
  }

  async getCommunity(
    challengeBaseId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ICommunity> {
    const challengeWithCommunity = await this.getChallengeBaseOrFail(
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
    const challengeWithContext = await this.getChallengeBaseOrFail(
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
    const challenge = await this.getChallengeBaseOrFail(
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
