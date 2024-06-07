import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
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
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { CreateVirtualContributorInput } from './dto/virtual.contributor.dto.create';
import { UpdateVirtualContributorInput } from './dto/virtual.contributor.dto.update';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { EventBus } from '@nestjs/cqrs';
import {
  IngestSpace,
  SpaceIngestionPurpose,
} from '@services/infrastructure/event-bus/commands';
import { VirtualPersonaService } from '@platform/virtual-persona/virtual.persona.service';
import { IVirtualPersona } from '@platform/virtual-persona';
import { BodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { Platform } from '@platform/platfrom/platform.entity';
import { IPlatform } from '@platform/platfrom/platform.interface';

@Injectable()
export class VirtualContributorService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private profileService: ProfileService,
    private storageAggregatorService: StorageAggregatorService,
    private virtualPersonaService: VirtualPersonaService,
    private communicationAdapter: CommunicationAdapter,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private namingService: NamingService,
    private eventBus: EventBus,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createVirtualContributor(
    virtualContributorData: CreateVirtualContributorInput
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
    await this.checkDisplayNameOrFail(
      virtualContributorData.profileData?.displayName
    );

    const virtualContributor: IVirtualContributor = VirtualContributor.create(
      virtualContributorData
    );

    virtualContributor.authorization = new AuthorizationPolicy();
    const communicationID = await this.communicationAdapter.tryRegisterNewUser(
      `virtual-contributor-${virtualContributor.nameID}@alkem.io`
    );
    if (communicationID) {
      virtualContributor.communicationID = communicationID;
    }

    let virtualPersona: IVirtualPersona;
    if (virtualContributorData.virtualPersonaID) {
      virtualPersona = await this.virtualPersonaService.getVirtualPersonaOrFail(
        virtualContributorData.virtualPersonaID
      );
    } else {
      virtualPersona = await this.getDefaultVirtualPersonaOrFail();
    }

    if (virtualContributorData.bodyOfKnowledgeType === undefined) {
      virtualContributor.bodyOfKnowledgeType = BodyOfKnowledgeType.OTHER;
    }

    virtualContributor.virtualPersona = virtualPersona;

    virtualContributor.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator();
    virtualContributor.profile = await this.profileService.createProfile(
      virtualContributorData.profileData,
      ProfileType.VIRTUAL_CONTRIBUTOR,
      virtualContributor.storageAggregator
    );
    await this.profileService.addTagsetOnProfile(virtualContributor.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.profileService.addTagsetOnProfile(virtualContributor.profile, {
      name: TagsetReservedName.CAPABILITIES,
      tags: [],
    });
    // Set the visuals
    let avatarURL = virtualContributorData.profileData?.avatarURL;
    if (!avatarURL) {
      avatarURL = this.profileService.generateRandomAvatar(
        virtualContributor.profile.displayName,
        ''
      );
    }
    await this.profileService.addVisualOnProfile(
      virtualContributor.profile,
      VisualType.AVATAR,
      avatarURL
    );

    virtualContributor.agent = await this.agentService.createAgent({
      parentDisplayID: `virtual-${virtualContributor.nameID}`,
    });

    const savedVC = await this.save(virtualContributor);
    this.logger.verbose?.(
      `Created new virtual with id ${virtualContributor.id}`,
      LogContext.COMMUNITY
    );

    if (virtualContributorData.bodyOfKnowledgeID)
      this.eventBus.publish(
        new IngestSpace(
          virtualContributorData.bodyOfKnowledgeID,
          SpaceIngestionPurpose.Knowledge
        )
      );

    return savedVC;
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

  // TODO: this is dirty, but works around a circular dependency if we use the actual platform module.
  // The underlying issue looks to be that the Room service has knowledge of the VP which seems odd...
  private async getDefaultVirtualPersonaOrFail(): Promise<IVirtualPersona> {
    let platform: IPlatform | null = null;
    platform = (
      await this.entityManager.find(Platform, {
        take: 1,
        relations: {
          defaultVirtualPersona: true,
        },
      })
    )?.[0];

    if (!platform || !platform.defaultVirtualPersona) {
      throw new EntityNotFoundException(
        'No Platform default persona found!',
        LogContext.PLATFORM
      );
    }
    return platform.defaultVirtualPersona;
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
      this.logger.verbose?.(
        `${virtualContributorData.nameID} - ${virtual.nameID}`,
        LogContext.COMMUNICATION
      );
      if (
        virtualContributorData.nameID.toLowerCase() !==
        virtual.nameID.toLowerCase()
      ) {
        // updating the nameID, check new value is allowed
        await this.checkNameIdOrFail(virtualContributorData.nameID);
        virtual.nameID = virtualContributorData.nameID;
      }
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
          storageAggregator: true,
        },
      }
    );

    if (virtualContributor.profile) {
      await this.profileService.deleteProfile(virtualContributor.profile.id);
    }

    if (virtualContributor.storageAggregator) {
      await this.storageAggregatorService.delete(
        virtualContributor.storageAggregator.id
      );
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
    return await this.virtualContributorRepository.save(virtualContributor);
  }

  async getAgent(virtualContributor: IVirtualContributor): Promise<IAgent> {
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

  async getStorageAggregatorOrFail(
    virtualID: string
  ): Promise<IStorageAggregator> {
    const virtualContributorWithStorageAggregator =
      await this.getVirtualContributorOrFail(virtualID, {
        relations: {
          storageAggregator: true,
        },
      });
    const storageAggregator =
      virtualContributorWithStorageAggregator.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storageAggregator for Virtual with nameID: ${virtualContributorWithStorageAggregator.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return storageAggregator;
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
}
