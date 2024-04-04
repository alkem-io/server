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
import { Virtual } from './virtual.entity';
import { IVirtual } from './virtual.interface';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { CreateVirtualInput } from './dto/virtual.dto.create';
import { UpdateVirtualInput } from './dto/virtual.dto.update';
import { DeleteVirtualInput } from './dto/virtualn.dto.delete';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';

@Injectable()
export class VirtualService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private profileService: ProfileService,
    private storageAggregatorService: StorageAggregatorService,
    @InjectRepository(Virtual)
    private virtualRepository: Repository<Virtual>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createVirtual(virtualData: CreateVirtualInput): Promise<IVirtual> {
    // Convert nameID to lower case
    virtualData.nameID = virtualData.nameID.toLowerCase();
    await this.checkNameIdOrFail(virtualData.nameID);
    await this.checkDisplayNameOrFail(virtualData.profileData?.displayName);

    const virtual: IVirtual = Virtual.create(virtualData);
    virtual.authorization = new AuthorizationPolicy();

    virtual.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator();
    virtual.profile = await this.profileService.createProfile(
      virtualData.profileData,
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
    let avatarURL = virtualData.profileData?.avatarURL;
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

    const savedOrg = await this.virtualRepository.save(virtual);
    this.logger.verbose?.(
      `Created new virtual with id ${virtual.id}`,
      LogContext.COMMUNITY
    );

    return savedOrg;
  }

  async checkNameIdOrFail(nameID: string) {
    const virtualCount = await this.virtualRepository.countBy({
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
    const virtualCount = await this.virtualRepository.countBy({
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

  async updateVirtual(virtualData: UpdateVirtualInput): Promise<IVirtual> {
    const virtual = await this.getVirtualOrFail(virtualData.ID, {
      relations: { profile: true },
    });

    await this.checkDisplayNameOrFail(
      virtualData.profileData?.displayName,
      virtual.profile.displayName
    );

    // Check the tagsets
    if (virtualData.profileData && virtual.profile) {
      virtual.profile = await this.profileService.updateProfile(
        virtual.profile,
        virtualData.profileData
      );
    }

    if (virtualData.nameID) {
      this.logger.verbose?.(
        `${virtualData.nameID} - ${virtual.nameID}`,
        LogContext.COMMUNICATION
      );
      if (virtualData.nameID.toLowerCase() !== virtual.nameID.toLowerCase()) {
        // updating the nameID, check new value is allowed
        await this.checkNameIdOrFail(virtualData.nameID);
        virtual.nameID = virtualData.nameID;
      }
    }

    if (virtualData.prompt !== undefined) {
      virtual.prompt = virtualData.prompt;
    }

    return await this.virtualRepository.save(virtual);
  }

  async deleteVirtual(deleteData: DeleteVirtualInput): Promise<IVirtual> {
    const orgID = deleteData.ID;
    const virtual = await this.getVirtualOrFail(orgID, {
      relations: {
        profile: true,
        agent: true,
        storageAggregator: true,
      },
    });

    if (virtual.profile) {
      await this.profileService.deleteProfile(virtual.profile.id);
    }

    if (virtual.storageAggregator) {
      await this.storageAggregatorService.delete(virtual.storageAggregator.id);
    }

    if (virtual.authorization) {
      await this.authorizationPolicyService.delete(virtual.authorization);
    }

    if (virtual.agent) {
      await this.agentService.deleteAgent(virtual.agent.id);
    }

    const result = await this.virtualRepository.remove(virtual as Virtual);
    result.id = orgID;
    return result;
  }

  async getVirtual(
    virtualID: string,
    options?: FindOneOptions<Virtual>
  ): Promise<IVirtual | null> {
    let virtual: IVirtual | null;
    if (virtualID.length === UUID_LENGTH) {
      virtual = await this.virtualRepository.findOne({
        ...options,
        where: { ...options?.where, id: virtualID },
      });
    } else {
      // look up based on nameID
      virtual = await this.virtualRepository.findOne({
        ...options,
        where: { ...options?.where, nameID: virtualID },
      });
    }
    return virtual;
  }

  async getVirtualOrFail(
    virtualID: string,
    options?: FindOneOptions<Virtual>
  ): Promise<IVirtual | never> {
    const virtual = await this.getVirtual(virtualID, options);
    if (!virtual)
      throw new EntityNotFoundException(
        `Unable to find Virtual with ID: ${virtualID}`,
        LogContext.COMMUNITY
      );
    return virtual;
  }

  async getVirtualAndAgent(
    virtualID: string
  ): Promise<{ virtual: IVirtual; agent: IAgent }> {
    const virtual = await this.getVirtualOrFail(virtualID, {
      relations: { agent: true },
    });

    if (!virtual.agent) {
      throw new EntityNotInitializedException(
        `Virtual Agent not initialized: ${virtualID}`,
        LogContext.AUTH
      );
    }
    return { virtual: virtual, agent: virtual.agent };
  }

  async getVirtuals(args: ContributorQueryArgs): Promise<IVirtual[]> {
    const limit = args.limit;
    const shuffle = args.shuffle || false;
    this.logger.verbose?.(
      `Querying all virtuals with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );

    const credentialsFilter = args.filter?.credentials;
    let virtuals: IVirtual[] = [];
    if (credentialsFilter) {
      virtuals = await this.virtualRepository
        .createQueryBuilder('virtual')
        .leftJoinAndSelect('virtual.agent', 'agent')
        .leftJoinAndSelect('agent.credentials', 'credential')
        .where('credential.type IN (:credentialsFilter)')
        .setParameters({
          credentialsFilter: credentialsFilter,
        })
        .getMany();
    } else {
      virtuals = await this.virtualRepository.find();
    }

    return limitAndShuffle(virtuals, limit, shuffle);
  }

  async save(virtual: IVirtual): Promise<IVirtual> {
    return await this.virtualRepository.save(virtual);
  }

  async getAgent(virtual: IVirtual): Promise<IAgent> {
    const virtualWithAgent = await this.getVirtualOrFail(virtual.id, {
      relations: { agent: true },
    });
    const agent = virtualWithAgent.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${virtual.id}`,
        LogContext.AUTH
      );

    return agent;
  }

  async getStorageAggregatorOrFail(
    virtualID: string
  ): Promise<IStorageAggregator> {
    const virtualWithStorageAggregator = await this.getVirtualOrFail(
      virtualID,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );
    const storageAggregator = virtualWithStorageAggregator.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storageAggregator for Virtual with nameID: ${virtualWithStorageAggregator.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return storageAggregator;
  }

  async virtualsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IVirtual[]> {
    const credResourceID = credentialCriteria.resourceID || '';
    const virtualMatches = await this.virtualRepository
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
    const results: IVirtual[] = [];
    for (const virtual of virtualMatches) {
      const loadedVirtual = await this.getVirtualOrFail(virtual.id);
      results.push(loadedVirtual);
    }
    return results;
  }

  async countVirtualsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';
    const virtualMatchesCount = await this.virtualRepository
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

    return virtualMatchesCount;
  }
}
