import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CredentialsSearchInput } from '@domain/actor/credential/dto/credentials.dto.search';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { ActorQueryArgs } from '@domain/actor/actor/dto';
import { VirtualContributor } from './virtual.contributor.entity';
import { IVirtualContributor } from './virtual.contributor.interface';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateVirtualContributorInput } from './dto/virtual.contributor.dto.create';
import { UpdateVirtualContributorInput } from './dto/virtual.contributor.dto.update';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { CreateAiPersonaInput } from '@services/ai-server/ai-persona/dto';
import { ActorContext } from '@core/actor-context';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { VirtualContributorLookupService } from '../virtual-contributor-lookup/virtual.contributor.lookup.service';
import { VirtualContributorDefaultsService } from '../virtual-contributor-defaults/virtual.contributor.defaults.service';
import { virtualContributorSettingsDefault } from './definition/virtual.contributor.settings.default';
import { UpdateVirtualContributorSettingsEntityInput } from '../virtual-contributor-settings';
import { VirtualContributorSettingsService } from '../virtual-contributor-settings/virtual.contributor.settings.service';
import {
  UpdateVirtualContributorPlatformSettingsEntityInput,
  VirtualContributorPlatformSettingsService,
} from '../virtual-contributor-platform-settings';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';

@Injectable()
export class VirtualContributorService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileAvatarService: ProfileAvatarService,
    private communicationAdapter: CommunicationAdapter,
    private aiPersonaService: AiPersonaService,
    private aiServerAdapter: AiServerAdapter,
    private knowledgeBaseService: KnowledgeBaseService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private virtualContributorSettingsService: VirtualContributorSettingsService,
    private virtualContributorPlatformSettingsService: VirtualContributorPlatformSettingsService,
    private accountLookupService: AccountLookupService,
    private virtualContributorDefaultsService: VirtualContributorDefaultsService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  public async createVirtualContributor(
    virtualContributorData: CreateVirtualContributorInput,
    knowledgeBaseDefaultCallouts: CreateCalloutInput[],
    storageAggregator: IStorageAggregator,
    actorContext?: ActorContext
  ): Promise<IVirtualContributor> {
    if (virtualContributorData.nameID) {
      // Convert nameID to lower case
      virtualContributorData.nameID =
        virtualContributorData.nameID.toLowerCase();
      await this.checkNameIdOrFail(virtualContributorData.nameID);
    } else {
      virtualContributorData.nameID =
        await this.virtualContributorDefaultsService.createVirtualContributorNameID(
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

    // Pull the settings from a defaults file
    virtualContributor.settings = virtualContributorSettingsDefault;

    virtualContributor.platformSettings = {
      promptGraphEditingEnabled: false,
    };

    const knowledgeBaseData =
      await this.virtualContributorDefaultsService.createKnowledgeBaseInput(
        virtualContributorData.knowledgeBaseData,
        knowledgeBaseDefaultCallouts,
        virtualContributorData.bodyOfKnowledgeType
      );

    virtualContributor.knowledgeBase =
      await this.knowledgeBaseService.createKnowledgeBase(
        knowledgeBaseData,
        storageAggregator,
        actorContext?.actorId
      );

    const kb = await this.knowledgeBaseService.save(
      virtualContributor.knowledgeBase
    );

    if (
      virtualContributorData.bodyOfKnowledgeType ===
      VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE
    ) {
      virtualContributor.bodyOfKnowledgeID = kb.id;
    }

    const aiPersonaInput: CreateAiPersonaInput = {
      ...virtualContributorData.aiPersona,
    };

    // Get the default AI server
    const aiServer = await this.aiServerAdapter.getAiServer();
    const aiPersona = await this.aiPersonaService.createAiPersona(
      aiPersonaInput,
      aiServer
    );
    virtualContributor.aiPersonaID = aiPersona.id;

    virtualContributor.profile = await this.profileService.createProfile(
      virtualContributorData.profileData,
      ProfileType.VIRTUAL,
      storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(
      virtualContributor.profile,
      {
        name: TagsetReservedName.KEYWORDS,
        tags: [],
      }
    );
    await this.profileService.addOrUpdateTagsetOnProfile(
      virtualContributor.profile,
      {
        name: TagsetReservedName.CAPABILITIES,
        tags: [],
      }
    );

    await this.profileAvatarService.addAvatarVisualToProfile(
      virtualContributor.profile,
      virtualContributorData.profileData
    );

    virtualContributor = await this.save(virtualContributor);

    const userID = actorContext?.actorId;
    await this.profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket(
      virtualContributor.profile.id,
      userID
    );

    // Reload to ensure have the updated avatar URL
    virtualContributor = await this.getVirtualContributorByIdOrFail(
      virtualContributor.id
    );

    // Sync the VC to the communication adapter
    // VirtualContributor.id (which is Actor.id) is used as the AlkemioActorID
    const displayName =
      virtualContributor.profile?.displayName || virtualContributor.nameID;
    try {
      await this.communicationAdapter.syncActor(
        virtualContributor.id,
        displayName
      );
      this.logger.verbose?.(
        `Synced VC actor to communication adapter: ${virtualContributor.id}`,
        LogContext.COMMUNITY
      );
    } catch (e: any) {
      this.logger.error(
        `Failed to sync VC actor to communication adapter: ${virtualContributor.id}`,
        e?.stack,
        LogContext.COMMUNITY
      );
      // Don't throw - VC creation should succeed even if sync fails
    }

    this.logger.verbose?.(
      `Created new virtual with id ${virtualContributor.id}`,
      LogContext.COMMUNITY
    );

    return virtualContributor;
  }

  public async updateVirtualContributorSettings(
    virtualContributor: IVirtualContributor,
    settingsData: UpdateVirtualContributorSettingsEntityInput
  ): Promise<IVirtualContributor> {
    virtualContributor.settings =
      this.virtualContributorSettingsService.updateSettings(
        virtualContributor.settings,
        settingsData
      );
    return await this.save(virtualContributor);
  }

  public async updateVirtualContributorPlatformSettings(
    virtualContributor: IVirtualContributor,
    settingsData: UpdateVirtualContributorPlatformSettingsEntityInput
  ): Promise<IVirtualContributor> {
    virtualContributor.platformSettings =
      this.virtualContributorPlatformSettingsService.updateSettings(
        virtualContributor.platformSettings,
        settingsData
      );

    return await this.save(virtualContributor);
  }

  private async checkNameIdOrFail(nameID: string) {
    const virtualCount = await this.virtualContributorRepository.countBy({
      nameID: nameID,
    });
    if (virtualCount >= 1)
      throw new ValidationException(
        `Virtual: the provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  private async checkDisplayNameOrFail(
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

  public async updateVirtualContributor(
    virtualContributorData: UpdateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual = await this.getVirtualContributorByIdOrFail(
      virtualContributorData.ID,
      {
        relations: {
          profile: true,
          knowledgeBase: {
            profile: true,
          },
        },
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

    if (
      virtualContributorData.knowledgeBaseData?.profile?.description &&
      virtual?.knowledgeBase?.profile
    ) {
      virtual.knowledgeBase.profile.description =
        virtualContributorData.knowledgeBaseData.profile?.description;
    }

    if (
      virtualContributorData.bodyOfKnowledgeType &&
      virtualContributorData.bodyOfKnowledgeType !== virtual.bodyOfKnowledgeType
    ) {
      virtual.bodyOfKnowledgeType = virtualContributorData.bodyOfKnowledgeType;
    }

    if (
      virtualContributorData.dataAccessMode &&
      virtualContributorData.dataAccessMode !== virtual.dataAccessMode
    ) {
      virtual.dataAccessMode = virtualContributorData.dataAccessMode;
    }

    if (virtualContributorData.interactionModes) {
      virtual.interactionModes = virtualContributorData.interactionModes;
    }

    if (typeof virtualContributorData.bodyOfKnowledgeDescription === 'string') {
      virtual.bodyOfKnowledgeDescription =
        virtualContributorData.bodyOfKnowledgeDescription;
    }

    return await this.save(virtual);
  }

  async deleteVirtualContributor(
    virtualContributorID: string
  ): Promise<IVirtualContributor> {
    const virtualContributor = await this.getVirtualContributorByIdOrFail(
      virtualContributorID,
      {
        relations: {
          profile: true,
          knowledgeBase: true,
        },
      }
    );

    if (!virtualContributor.profile || !virtualContributor.knowledgeBase) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual: ${virtualContributor.id} `,
        LogContext.COMMUNITY
      );
    }

    await this.profileService.deleteProfile(virtualContributor.profile.id);

    if (virtualContributor.authorization) {
      await this.authorizationPolicyService.delete(
        virtualContributor.authorization
      );
    }

    // Note: Credentials are on Actor (which VirtualContributor extends), will be deleted via cascade

    const result = await this.virtualContributorRepository.remove(
      virtualContributor as VirtualContributor
    );
    result.id = virtualContributorID;

    if (virtualContributor.aiPersonaID) {
      try {
        await this.aiPersonaService.deleteAiPersona({
          ID: virtualContributor.aiPersonaID,
        });
      } catch (error: any) {
        this.logger.error(
          {
            message: 'Failed to delete external AI Persona.',
            aiPersonaID: virtualContributor.aiPersonaID,
            virtualContributorID,
          },
          error?.stack,
          LogContext.AI_PERSONA
        );
      }
    }

    await this.knowledgeBaseService.delete(virtualContributor.knowledgeBase);
    await this.deleteVCInvitations(virtualContributorID);

    return result;
  }

  async getVirtualContributor(
    virtualContributorID: string,
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor | null> {
    const virtualContributor = await this.virtualContributorRepository.findOne({
      ...options,
      where: { ...options?.where, id: virtualContributorID },
    });

    return virtualContributor;
  }

  async getVirtualContributorByIdOrFail(
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

  // VirtualContributor extends Actor and has credentials directly.
  async getVirtualContributorWithCredentials(
    virtualID: string
  ): Promise<IVirtualContributor> {
    const virtualContributor = await this.getVirtualContributorByIdOrFail(
      virtualID,
      {
        relations: { credentials: true },
      }
    );

    return virtualContributor;
  }

  // Convenience method returning the VC along with its actorId and credentials.
  // VirtualContributor extends Actor, so actorId === virtualContributor.id
  async getVirtualContributorAndActor(virtualID: string): Promise<{
    virtualContributor: IVirtualContributor;
    actorId: string;
    credentials: ICredential[];
  }> {
    const virtualContributor =
      await this.getVirtualContributorWithCredentials(virtualID);

    return {
      virtualContributor,
      actorId: virtualContributor.id,
      credentials: virtualContributor.credentials || [],
    };
  }

  public async getStorageBucket(
    virtualContributorID: string
  ): Promise<IStorageBucket> {
    const virtualContributor = await this.getVirtualContributorByIdOrFail(
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
    actorContext: ActorContext
  ): Promise<boolean> {
    this.logger.verbose?.(
      `refreshing the body of knowledge ${virtualContributor.id}, by ${actorContext.actorId}`,
      LogContext.VIRTUAL_CONTRIBUTOR
    );

    // no refresh needed for these types
    if (
      [
        VirtualContributorBodyOfKnowledgeType.NONE,
        VirtualContributorBodyOfKnowledgeType.OTHER,
      ].includes(virtualContributor.bodyOfKnowledgeType)
    ) {
      return Promise.resolve(false);
    }

    return this.aiServerAdapter.refreshBodyOfKnowledge(
      // Guidance engine doens't have BoK ID for now, so fallback to empty string
      // next layer knows what to do
      virtualContributor.bodyOfKnowledgeID ?? '',
      virtualContributor.bodyOfKnowledgeType,
      virtualContributor.aiPersonaID
    );
  }

  public async refreshAllBodiesOfKnowledge(actorContext: ActorContext) {
    const virtualContributors = await this.getVirtualContributors();
    for (const vc of virtualContributors) {
      try {
        await this.refreshBodyOfKnowledge(vc, actorContext);
      } catch (error: any) {
        this.logger.error(
          {
            message: 'Failed to refresh body of knowledge for VC.',
            virtualContributorID: vc.id,
          },
          error?.stack,
          LogContext.VIRTUAL_CONTRIBUTOR
        );
      }
    }
    return true;
  }

  // TODO: move to store
  async getVirtualContributors(
    args: ActorQueryArgs = {}
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
      // VirtualContributor extends Actor - credentials are directly on virtual_contributor
      virtualContributors = await this.virtualContributorRepository
        .createQueryBuilder('virtual_contributor')
        .leftJoinAndSelect('virtual_contributor.credentials', 'credential')
        .where('credential.type IN (:...credentialsFilter)')
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

  public async getProvider(
    virtualContributor: IVirtualContributor
  ): Promise<IActor> {
    const account = await this.virtualContributorLookupService.getAccountOrFail(
      virtualContributor.id
    );

    const host = await this.accountLookupService.getHostOrFail(account);
    return host;
  }

  async getKnowledgeBaseOrFail(
    virtualContributor: IVirtualContributor
  ): Promise<IKnowledgeBase | never> {
    if (virtualContributor.knowledgeBase) {
      return virtualContributor.knowledgeBase;
    }
    const virtualContributorWithKnowledgeBase =
      await this.getVirtualContributorByIdOrFail(virtualContributor.id, {
        relations: {
          knowledgeBase: true,
        },
      });
    const knowledgeBase = virtualContributorWithKnowledgeBase.knowledgeBase;

    if (!knowledgeBase) {
      throw new EntityNotFoundException(
        `Unable to find knowledge base for VirtualContributor: ${virtualContributor.id}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }

    return knowledgeBase;
  }

  async getAiPersonaOrFail(
    virtualContributor: IVirtualContributor
  ): Promise<IAiPersona> {
    return await this.aiPersonaService.getAiPersonaOrFail(
      virtualContributor.aiPersonaID
    );
  }

  async countVirtualContributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';
    // VirtualContributor extends Actor - credentials are directly on virtual_contributor
    const virtualContributorMatchesCount =
      await this.virtualContributorRepository
        .createQueryBuilder('virtual')
        .leftJoinAndSelect('virtual.credentials', 'credential')
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
    return aiPersona.bodyOfKnowledgeLastUpdated;
  }

  //adding this to avoid circular dependency between VirtualContributor, Room, and Invitation
  private async deleteVCInvitations(contributorID: string) {
    const invitations = await this.entityManager.find(Invitation, {
      where: { invitedActorId: contributorID },
    });
    for (const invitation of invitations) {
      if (invitation.authorization) {
        await this.authorizationPolicyService.delete(invitation.authorization);
      }
      await this.entityManager.remove(invitation);
    }
  }
}
