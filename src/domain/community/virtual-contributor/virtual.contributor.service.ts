import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';
import { VirtualContributor } from './virtual.contributor.entity';
import { IVirtualContributor } from './virtual.contributor.interface';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateVirtualContributorInput } from './dto/virtual.contributor.dto.create';
import { UpdateVirtualContributorInput } from './dto/virtual.contributor.dto.update';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { AiPersonaService } from '../ai-persona/ai.persona.service';
import { CreateAiPersonaInput } from '../ai-persona/dto';
import { VirtualContributorQuestionInput } from './dto/virtual.contributor.dto.question.input';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { AiServerAdapterAskQuestionInput } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.ask.question';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';
import { IAiPersona } from '../ai-persona';
import { IContributor } from '../contributor/contributor.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

import { AgentType } from '@common/enums/agent.type';
import { ContributorService } from '../contributor/contributor.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { VcInteractionService } from '@domain/communication/vc-interaction/vc.interaction.service';

@Injectable()
export class VirtualContributorService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private profileService: ProfileService,
    private contributorService: ContributorService,
    private communicationAdapter: CommunicationAdapter,
    private namingService: NamingService,
    private aiPersonaService: AiPersonaService,
    private aiServerAdapter: AiServerAdapter,
    private accountHostService: AccountHostService,
    private vcInteractionService: VcInteractionService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createVirtualContributor(
    virtualContributorData: CreateVirtualContributorInput,
    storageAggregator: IStorageAggregator,
    agentInfo?: AgentInfo
  ): Promise<IVirtualContributor> {
    if (virtualContributorData.nameID) {
      // Convert nameID to lower case
      virtualContributorData.nameID =
        virtualContributorData.nameID.toLowerCase();
      await this.checkNameIdOrFail(virtualContributorData.nameID);
    } else {
      virtualContributorData.nameID = await this.createVirtualContributorNameID(
        virtualContributorData.profileData?.displayName || ''
      );
    }

    let virtualContributor: IVirtualContributor = VirtualContributor.create(
      virtualContributorData
    );

    virtualContributor.listedInStore = true;
    virtualContributor.searchVisibility = SearchVisibility.ACCOUNT;

    virtualContributor.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.VIRTUAL_CONTRIBUTOR
    );
    const communicationID = await this.communicationAdapter.tryRegisterNewUser(
      `virtual-contributor-${virtualContributor.nameID}@alkem.io`
    );
    if (communicationID) {
      virtualContributor.communicationID = communicationID;
    }

    this.logger.log(virtualContributorData);
    const aiPersonaInput: CreateAiPersonaInput = {
      ...virtualContributorData.aiPersona,
      description: `AI Persona for virtual contributor ${virtualContributor.nameID}`,
    };
    virtualContributor.aiPersona =
      await this.aiPersonaService.createAiPersona(aiPersonaInput);

    virtualContributor.profile = await this.profileService.createProfile(
      virtualContributorData.profileData,
      ProfileType.VIRTUAL_CONTRIBUTOR,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(virtualContributor.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.profileService.addTagsetOnProfile(virtualContributor.profile, {
      name: TagsetReservedName.CAPABILITIES,
      tags: [],
    });

    this.contributorService.addAvatarVisualToContributorProfile(
      virtualContributor.profile,
      virtualContributorData.profileData
    );

    virtualContributor.agent = await this.agentService.createAgent({
      type: AgentType.VIRTUAL_CONTRIBUTOR,
    });

    virtualContributor = await this.save(virtualContributor);

    const userID = agentInfo ? agentInfo.userID : '';
    await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
      virtualContributor.profile.id,
      userID
    );
    // Reload to ensure have the updated avatar URL
    virtualContributor = await this.getVirtualContributorOrFail(
      virtualContributor.id
    );
    this.logger.verbose?.(
      `Created new virtual with id ${virtualContributor.id}`,
      LogContext.COMMUNITY
    );

    return virtualContributor;
  }

  async checkNameIdOrFail(nameID: string) {
    const virtualCount = await this.virtualContributorRepository.countBy({
      nameID: nameID,
    });
    if (virtualCount >= 1)
      throw new ValidationException(
        `Virtual: the provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  async checkDisplayNameOrFail(
    newDisplayName?: string,
    existingDisplayName?: string
  ) {
    if (!newDisplayName) {
      return;
    }
    if (newDisplayName === existingDisplayName) {
      return;
    }
    const virtualCount = await this.virtualContributorRepository.countBy({
      profile: {
        displayName: newDisplayName,
      },
    });
    if (virtualCount >= 1)
      throw new ValidationException(
        `Virtual: the provided displayName is already taken: ${newDisplayName}`,
        LogContext.COMMUNITY
      );
  }

  async updateVirtualContributor(
    virtualContributorData: UpdateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual = await this.getVirtualContributorOrFail(
      virtualContributorData.ID,
      {
        relations: { profile: true },
      }
    );

    await this.checkDisplayNameOrFail(
      virtualContributorData.profileData?.displayName,
      virtual.profile.displayName
    );

    // Check the tagsets
    if (virtualContributorData.profileData && virtual.profile) {
      virtual.profile = await this.profileService.updateProfile(
        virtual.profile,
        virtualContributorData.profileData
      );
    }

    if (virtualContributorData.nameID) {
      if (
        virtualContributorData.nameID.toLowerCase() !==
        virtual.nameID.toLowerCase()
      ) {
        // updating the nameID, check new value is allowed
        await this.checkNameIdOrFail(virtualContributorData.nameID);
        virtual.nameID = virtualContributorData.nameID;
      }
    }

    if (typeof virtualContributorData.listedInStore === 'boolean') {
      virtual.listedInStore = !!virtualContributorData.listedInStore;
    }

    if (virtualContributorData.searchVisibility) {
      virtual.searchVisibility = virtualContributorData.searchVisibility;
    }

    return await this.save(virtual);
  }

  async deleteVirtualContributor(
    virtualContributorID: string
  ): Promise<IVirtualContributor> {
    const virtualContributor = await this.getVirtualContributorOrFail(
      virtualContributorID,
      {
        relations: {
          profile: true,
          agent: true,
        },
      }
    );

    if (virtualContributor.profile) {
      await this.profileService.deleteProfile(virtualContributor.profile.id);
    }

    if (virtualContributor.authorization) {
      await this.authorizationPolicyService.delete(
        virtualContributor.authorization
      );
    }

    if (virtualContributor.agent) {
      await this.agentService.deleteAgent(virtualContributor.agent.id);
    }

    const result = await this.virtualContributorRepository.remove(
      virtualContributor as VirtualContributor
    );
    result.id = virtualContributorID;

    if (virtualContributor.aiPersona) {
      await this.aiPersonaService.deleteAiPersona({
        ID: virtualContributor.aiPersona.id,
      });
    }

    await this.deleteVCInvitations(virtualContributorID);

    return result;
  }

  async getVirtualContributor(
    virtualContributorID: string,
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor | null> {
    let virtualContributor: IVirtualContributor | null;
    if (virtualContributorID.length === UUID_LENGTH) {
      virtualContributor = await this.virtualContributorRepository.findOne({
        ...options,
        where: { ...options?.where, id: virtualContributorID },
      });
    } else {
      // look up based on nameID
      virtualContributor = await this.virtualContributorRepository.findOne({
        ...options,
        where: { ...options?.where, nameID: virtualContributorID },
      });
    }
    return virtualContributor;
  }

  async getVirtualContributorOrFail(
    virtualID: string,
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor | never> {
    const virtual = await this.getVirtualContributor(virtualID, options);
    if (!virtual)
      throw new EntityNotFoundException(
        `Unable to find Virtual with ID: ${virtualID}`,
        LogContext.COMMUNITY
      );
    return virtual;
  }

  async getVirtualContributorAndAgent(
    virtualID: string
  ): Promise<{ virtualContributor: IVirtualContributor; agent: IAgent }> {
    const virtualContributor = await this.getVirtualContributorOrFail(
      virtualID,
      {
        relations: { agent: true },
      }
    );

    if (!virtualContributor.agent) {
      throw new EntityNotInitializedException(
        `Virtual Contributor Agent not initialized: ${virtualID}`,
        LogContext.AUTH
      );
    }
    return {
      virtualContributor: virtualContributor,
      agent: virtualContributor.agent,
    };
  }

  public async getStorageBucket(
    virtualContributorID: string
  ): Promise<IStorageBucket> {
    const virtualContributor = await this.getVirtualContributorOrFail(
      virtualContributorID,
      {
        relations: {
          profile: {
            storageBucket: true,
          },
        },
      }
    );
    const storageBucket = virtualContributor?.profile?.storageBucket;
    if (!storageBucket) {
      throw new RelationshipNotFoundException(
        `Unable to find storage bucket to use for Virtual Contributor: ${virtualContributorID}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }
    return storageBucket;
  }

  public async refreshBodyOfKnowledge(
    virtualContributor: IVirtualContributor,
    agentInfo: AgentInfo
  ): Promise<boolean> {
    if (!virtualContributor.aiPersona) {
      throw new EntityNotInitializedException(
        `Virtual Contributor does not have aiPersona initialized: ${virtualContributor.id}`,
        LogContext.AUTH
      );
    }
    this.logger.verbose?.(
      `refreshing the body of knowledge ${virtualContributor.id}, by ${agentInfo.userID}`,
      LogContext.VIRTUAL_CONTRIBUTOR
    );

    const aiPersona = virtualContributor.aiPersona;

    return await this.aiServerAdapter.refreshBodyOfKnowledge(
      aiPersona.aiPersonaServiceID
    );
  }

  public async askQuestion(
    vcQuestionInput: VirtualContributorQuestionInput
  ): Promise<IMessageAnswerToQuestion> {
    const virtualContributor = await this.getVirtualContributorOrFail(
      vcQuestionInput.virtualContributorID,
      {
        relations: {
          authorization: true,
          aiPersona: true,
          agent: true,
          profile: true,
        },
      }
    );
    if (!virtualContributor.agent) {
      throw new EntityNotInitializedException(
        `Virtual Contributor Agent not initialized: ${vcQuestionInput.virtualContributorID}`,
        LogContext.AUTH
      );
    }
    this.logger.verbose?.(
      `still need to use the context ${vcQuestionInput.contextSpaceID}, ${vcQuestionInput.userID}`,
      LogContext.AI_PERSONA_SERVICE_ENGINE
    );

    const vcInteraction =
      await this.vcInteractionService.getVcInteractionOrFail(
        vcQuestionInput.vcInteractionID!
      );

    const aiServerAdapterQuestionInput: AiServerAdapterAskQuestionInput = {
      aiPersonaServiceID: virtualContributor.aiPersona.aiPersonaServiceID,
      question: vcQuestionInput.question,
      contextID: vcQuestionInput.contextSpaceID,
      userID: vcQuestionInput.userID,
      threadID: vcQuestionInput.threadID,
      vcInteractionID: vcInteraction.id,
      externalMetadata: vcInteraction.externalMetadata,
      description: virtualContributor.profile.description,
      displayName: virtualContributor.profile.displayName,
    };

    const response = await this.aiServerAdapter.askQuestion(
      aiServerAdapterQuestionInput
    );

    if (!vcInteraction.externalMetadata.threadId && response.threadId) {
      vcInteraction.externalMetadata.threadId = response.threadId;
      await this.vcInteractionService.save(vcInteraction);
    }

    return response;
  }

  // TODO: move to store
  async getVirtualContributors(
    args: ContributorQueryArgs
  ): Promise<IVirtualContributor[]> {
    const limit = args.limit;
    const shuffle = args.shuffle || false;
    this.logger.verbose?.(
      `Querying all virtual contributors with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );

    const credentialsFilter = args.filter?.credentials;
    let virtualContributors: IVirtualContributor[] = [];
    if (credentialsFilter) {
      virtualContributors = await this.virtualContributorRepository
        .createQueryBuilder('virtual_contributor')
        .leftJoinAndSelect('virtual_contributor.agent', 'agent')
        .leftJoinAndSelect('agent.credentials', 'credential')
        .where('credential.type IN (:credentialsFilter)')
        .setParameters({
          credentialsFilter: credentialsFilter,
        })
        .getMany();
    } else {
      virtualContributors = await this.virtualContributorRepository.find();
    }

    return limitAndShuffle(virtualContributors, limit, shuffle);
  }

  async save(
    virtualContributor: IVirtualContributor
  ): Promise<IVirtualContributor> {
    return this.virtualContributorRepository.save(virtualContributor);
  }

  public async getAgent(
    virtualContributor: IVirtualContributor
  ): Promise<IAgent> {
    const virtualContributorWithAgent = await this.getVirtualContributorOrFail(
      virtualContributor.id,
      {
        relations: { agent: true },
      }
    );
    const agent = virtualContributorWithAgent.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `Virtual Contributor Agent not initialized: ${virtualContributor.id}`,
        LogContext.AUTH
      );

    return agent;
  }

  public async getProvider(
    virtualContributor: IVirtualContributor
  ): Promise<IContributor> {
    const virtualContributorWithAccount =
      await this.getVirtualContributorOrFail(virtualContributor.id, {
        relations: { account: true },
      });
    const account = virtualContributorWithAccount.account;
    if (!account)
      throw new EntityNotInitializedException(
        `Virtual Contributor Account not initialized: ${virtualContributor.id}`,
        LogContext.AUTH
      );

    const host = await this.accountHostService.getHostOrFail(account);
    return host;
  }

  public async getAccountHostCredentials(
    virtualContributorID: string
  ): Promise<ICredentialDefinition[]> {
    const virtualContributorWithAccount =
      await this.getVirtualContributorOrFail(virtualContributorID, {
        relations: { account: true },
      });
    const account = virtualContributorWithAccount.account;
    if (!account)
      throw new EntityNotInitializedException(
        `Virtual Contributor Account not initialized: ${virtualContributorID}`,
        LogContext.AUTH
      );

    const hostCredentials =
      await this.accountHostService.getHostCredentials(account);
    return hostCredentials;
  }

  async getAiPersonaOrFail(
    virtualContributor: IVirtualContributor
  ): Promise<IAiPersona> {
    if (virtualContributor.aiPersona) {
      return virtualContributor.aiPersona;
    }
    const virtualContributorWithAiPersona =
      await this.getVirtualContributorOrFail(virtualContributor.id, {
        relations: {
          aiPersona: true,
        },
      });
    const aiPersona = virtualContributorWithAiPersona.aiPersona;

    if (!aiPersona) {
      throw new EntityNotFoundException(
        `Unable to find aiPersona for VirtualContributor: ${virtualContributor.id}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }

    return aiPersona;
  }

  async virtualContributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IVirtualContributor[]> {
    const credResourceID = credentialCriteria.resourceID || '';
    const virtualContributorMatches = await this.virtualContributorRepository
      .createQueryBuilder('virtual_contributor')
      .leftJoinAndSelect('virtual_contributor.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .getMany();

    // reload to go through the normal loading path
    const results: IVirtualContributor[] = [];
    for (const virtualContributor of virtualContributorMatches) {
      const loadedVirtual = await this.getVirtualContributorOrFail(
        virtualContributor.id
      );
      results.push(loadedVirtual);
    }
    return results;
  }

  public async createVirtualContributorNameID(
    displayName: string
  ): Promise<string> {
    const base = `${displayName}`;
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInVirtualContributors(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }

  async countVirtualContributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';
    const virtualContributorMatchesCount =
      await this.virtualContributorRepository
        .createQueryBuilder('virtual')
        .leftJoinAndSelect('virtual.agent', 'agent')
        .leftJoinAndSelect('agent.credentials', 'credential')
        .where('credential.type = :type')
        .andWhere('credential.resourceID = :resourceID')
        .setParameters({
          type: `${credentialCriteria.type}`,
          resourceID: credResourceID,
        })
        .getCount();

    return virtualContributorMatchesCount;
  }

  async getBodyOfKnowledgeLastUpdated(virtualContributor: IVirtualContributor) {
    const aiPersona = await this.getAiPersonaOrFail(virtualContributor);
    return this.aiServerAdapter.getBodyOfKnowledgeLastUpdated(
      aiPersona.aiPersonaServiceID
    );
  }

  //adding this to avoid circular dependency between VirtualContributor, Room, and Invitation
  private async deleteVCInvitations(contributorID: string) {
    const invitations = await this.entityManager.find(Invitation, {
      where: { invitedContributorID: contributorID },
    });
    for (const invitation of invitations) {
      if (invitation.authorization) {
        await this.authorizationPolicyService.delete(invitation.authorization);
      }
      await this.entityManager.remove(invitation);
    }
  }
}
