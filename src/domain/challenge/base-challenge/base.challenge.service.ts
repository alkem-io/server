import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { IContext } from '@domain/context/context/context.interface';
import { ContextService } from '@domain/context/context/context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { NamingService } from '@src/services/domain/naming/naming.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CredentialService } from '@domain/agent/credential/credential.service';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';

@Injectable()
export class BaseChallengeService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private contextService: ContextService,
    private agentService: AgentService,
    private credentialService: CredentialService,
    private communityService: CommunityService,
    private namingService: NamingService,
    private tagsetService: TagsetService,
    private lifecycleService: LifecycleService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async initialise(
    baseChallenge: IBaseChallenge,
    baseChallengeData: CreateBaseChallengeInput,
    ecoverseID: string
  ) {
    baseChallenge.authorization = new AuthorizationPolicy();
    await this.isNameAvailableOrFail(baseChallengeData.nameID, ecoverseID);
    baseChallenge.community = await this.communityService.createCommunity(
      baseChallenge.displayName
    );
    baseChallenge.community.ecoverseID = ecoverseID;

    if (!baseChallengeData.context) {
      baseChallenge.context = await this.contextService.createContext({});
    } else {
      baseChallenge.context = await this.contextService.createContext(
        baseChallengeData.context
      );
    }

    baseChallenge.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: baseChallengeData.tags || [],
    });

    baseChallenge.agent = await this.agentService.createAgent({
      parentDisplayID: `${baseChallenge.nameID}`,
    });
  }

  async setMembershipCredential(
    baseChallenge: IBaseChallenge,
    membershipCredentialType: AuthorizationCredential
  ): Promise<ICommunity> {
    const membershipCredential = await this.credentialService.createCredential({
      type: membershipCredentialType,
      resourceID: baseChallenge.id,
    });
    const community = baseChallenge.community;
    if (!community) {
      throw new EntityNotInitializedException(
        `Base challenge not initialised: ${baseChallenge.id}`,
        LogContext.CHALLENGES
      );
    }
    community.credential = membershipCredential;
    return community;
  }

  async update(
    baseChallengeData: UpdateBaseChallengeInput,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const baseChallenge = await this.getBaseChallengeOrFail(
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

  async deleteEntities(baseChallenge: IBaseChallenge) {
    if (baseChallenge.context) {
      await this.contextService.removeContext(baseChallenge.context.id);
    }

    const community = baseChallenge.community;
    if (community) {
      await this.communityService.removeCommunity(community.id);
      if (community.credential) {
        await this.credentialService.deleteCredential(community.credential.id);
      }
    }

    if (baseChallenge.lifecycle) {
      await this.lifecycleService.deleteLifecycle(baseChallenge.lifecycle.id);
    }

    if (baseChallenge.tagset) {
      await this.tagsetService.removeTagset({
        ID: baseChallenge.tagset.id,
      });
    }

    if (baseChallenge.agent) {
      await this.agentService.deleteAgent(baseChallenge.agent.id);
    }

    if (baseChallenge.authorization) {
      await this.authorizationPolicyService.delete(baseChallenge.authorization);
    }
  }

  async getBaseChallengeOrFail(
    baseChallengeID: string,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const conditions: FindConditions<BaseChallenge> = {
      id: baseChallengeID,
    };

    const challenge = await repository.findOne(conditions, options);
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${baseChallengeID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async isNameAvailableOrFail(nameID: string, nameableScopeID: string) {
    if (
      !(await this.namingService.isNameIdAvailableInEcoverse(
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
    baseChallengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ICommunity> {
    const challengeWithCommunity = await this.getBaseChallengeOrFail(
      baseChallengeId,
      repository,
      {
        relations: ['community'],
      }
    );
    const community = challengeWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for challenge ${baseChallengeId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  async getContext(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IContext> {
    const challengeWithContext = await this.getBaseChallengeOrFail(
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

  async getAgent(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IAgent> {
    const challengeWithContext = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: ['agent'],
      }
    );
    const agent = challengeWithContext.agent;
    if (!agent)
      throw new RelationshipNotFoundException(
        `Unable to load Agent for challenge ${challengeId}`,
        LogContext.AGENT
      );
    return agent;
  }

  async getLifecycle(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ILifecycle> {
    const challenge = await this.getBaseChallengeOrFail(
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

  async getMembersCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const community = await this.getCommunity(baseChallenge.id, repository);
    return await this.communityService.getMembersCount(community);
  }
}
