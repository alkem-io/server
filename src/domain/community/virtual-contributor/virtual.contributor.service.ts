import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
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
import { CreateVirtualInput as CreateVirtualContributorInput } from './dto/virtual.contributor.dto.create';
import { UpdateVirtualInput as UpdateVirtualContributorInput } from './dto/virtual.contributor.dto.update';
import { DeleteVirtualInput as DeleteVirtualContributorInput } from './dto/virtual.contributor.dto.delete';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';

@Injectable()
export class VirtualContributorService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private profileService: ProfileService,
    private storageAggregatorService: StorageAggregatorService,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createVirtualContributor(
    virtualContributorData: CreateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    // Convert nameID to lower case
    virtualContributorData.nameID = virtualContributorData.nameID.toLowerCase();
    await this.checkNameIdOrFail(virtualContributorData.nameID);
    await this.checkDisplayNameOrFail(
      virtualContributorData.profileData?.displayName
    );

    const virtual: IVirtualContributor = VirtualContributor.create(
      virtualContributorData
    );
    virtual.authorization = new AuthorizationPolicy();

    virtual.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator();
    virtual.profile = await this.profileService.createProfile(
      virtualContributorData.profileData,
      ProfileType.ORGANIZATION,
      virtual.storageAggregator
    );
    await this.profileService.addTagsetOnProfile(virtual.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.profileService.addTagsetOnProfile(virtual.profile, {
      name: TagsetReservedName.CAPABILITIES,
      tags: [],
    });
    // Set the visuals
    let avatarURL = virtualContributorData.profileData?.avatarURL;
    if (!avatarURL) {
      avatarURL = this.profileService.generateRandomAvatar(
        virtual.profile.displayName,
        ''
      );
    }
    await this.profileService.addVisualOnProfile(
      virtual.profile,
      VisualType.AVATAR,
      avatarURL
    );

    virtual.agent = await this.agentService.createAgent({
      parentDisplayID: `virtual-${virtual.nameID}`,
    });

    const savedOrg = await this.virtualContributorRepository.save(virtual);
    this.logger.verbose?.(
      `Created new virtual with id ${virtual.id}`,
      LogContext.COMMUNITY
    );

    return savedOrg;
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

    if (virtualContributorData.prompt !== undefined) {
      virtual.prompt = virtualContributorData.prompt;
    }

    return await this.virtualContributorRepository.save(virtual);
  }

  async deleteVirtualContributor(
    deleteData: DeleteVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const orgID = deleteData.ID;
    const virtualContributor = await this.getVirtualContributorOrFail(orgID, {
      relations: {
        profile: true,
        agent: true,
        storageAggregator: true,
      },
    });

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
    result.id = orgID;
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
        `Virtual Agent not initialized: ${virtualID}`,
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
      `Querying all virtuals with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );

    const credentialsFilter = args.filter?.credentials;
    let virtualContributors: IVirtualContributor[] = [];
    if (credentialsFilter) {
      virtualContributors = await this.virtualContributorRepository
        .createQueryBuilder('virtual')
        .leftJoinAndSelect('virtual.agent', 'agent')
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
        `User Agent not initialized: ${virtualContributor.id}`,
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
      .createQueryBuilder('virtual')
      .leftJoinAndSelect('virtual.agent', 'agent')
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
