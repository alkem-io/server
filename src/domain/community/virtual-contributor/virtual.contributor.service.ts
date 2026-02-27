import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { SearchVisibility } from '@common/enums/search.visibility';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ActorContext } from '@core/actor-context/actor.context';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorQueryArgs } from '@domain/actor/actor/dto';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { CredentialsSearchInput } from '@domain/actor/credential/dto/credentials.dto.search';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { CreateAiPersonaInput } from '@services/ai-server/ai-persona/dto';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { VirtualContributorDefaultsService } from '../virtual-contributor-defaults/virtual.contributor.defaults.service';
import { VirtualContributorLookupService } from '../virtual-contributor-lookup/virtual.contributor.lookup.service';
import {
  UpdateVirtualContributorPlatformSettingsEntityInput,
  VirtualContributorPlatformSettingsService,
} from '../virtual-contributor-platform-settings';
import { UpdateVirtualContributorSettingsEntityInput } from '../virtual-contributor-settings';
import { VirtualContributorSettingsService } from '../virtual-contributor-settings/virtual.contributor.settings.service';
import { virtualContributorSettingsDefault } from './definition/virtual.contributor.settings.default';
import { CreateVirtualContributorInput } from './dto/virtual.contributor.dto.create';
import { UpdateVirtualContributorInput } from './dto/virtual.contributor.dto.update';
import { VirtualContributor } from './virtual.contributor.entity';
import { IVirtualContributor } from './virtual.contributor.interface';

@Injectable()
export class VirtualContributorService {
  constructor(
    private actorService: ActorService,
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
    // nameID is inherited from Actor (CTI), not a @Column on VirtualContributor,
    // so TypeORM's create() won't copy it from the input — set it explicitly.
    virtualContributor.nameID = virtualContributorData.nameID!;

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

    // In-memory entity construction (no DB writes)
    virtualContributor.knowledgeBase =
      await this.knowledgeBaseService.createKnowledgeBase(
        knowledgeBaseData,
        storageAggregator,
        actorContext?.actorID
      );

    const aiPersonaInput: CreateAiPersonaInput = {
      ...virtualContributorData.aiPersona,
    };

    // Read-only query — safe outside the transaction
    const aiServer = await this.aiServerAdapter.getAiServer();

    virtualContributor.profile = await this.profileService.createProfile(
      virtualContributorData.profileData,
      ProfileType.VIRTUAL_CONTRIBUTOR,
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

    // Single transaction: all DB writes (KnowledgeBase, AiPersona, Actor,
    // VirtualContributor) are atomic — no orphans if any step fails.
    virtualContributor =
      await this.virtualContributorRepository.manager.transaction(async mgr => {
        const kb = await this.knowledgeBaseService.save(
          virtualContributor.knowledgeBase,
          mgr
        );

        if (
          virtualContributorData.bodyOfKnowledgeType ===
          VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE
        ) {
          virtualContributor.bodyOfKnowledgeID = kb.id;
        }

        const aiPersona = await this.aiPersonaService.createAiPersona(
          aiPersonaInput,
          aiServer,
          mgr
        );
        virtualContributor.aiPersonaID = aiPersona.id;

        return await mgr.save(virtualContributor as VirtualContributor);
      });

    const userID = actorContext?.actorID;
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
    const virtualCount = await this.virtualContributorRepository.count({
      where: { nameID: nameID },
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

    // All DB deletions in a single transaction so a partial failure
    // does not leave the VC in an inconsistent state.
    await this.virtualContributorRepository.manager.transaction(async () => {
      await this.profileService.deleteProfile(virtualContributor.profile.id);

      if (virtualContributor.authorization) {
        await this.authorizationPolicyService.delete(
          virtualContributor.authorization
        );
      }

      await this.knowledgeBaseService.delete(virtualContributor.knowledgeBase);
      await this.deleteVCInvitations(virtualContributorID);

      if (virtualContributor.aiPersonaID) {
        try {
          await this.aiPersonaService.deleteAiPersona({
            ID: virtualContributor.aiPersonaID,
          });
        } catch (error: any) {
          this.logger.error(
            {
              message: 'Failed to delete AI Persona during VC deletion',
              aiPersonaID: virtualContributor.aiPersonaID,
              virtualContributorID,
            },
            error?.stack,
            LogContext.AI_PERSONA
          );
        }
      }

      // Delete actor — cascades to delete the VC row via FK (virtual_contributor.id → actor.id ON DELETE CASCADE).
      // Also cascades to delete credentials (credential.actorID → actor.id ON DELETE CASCADE).
      await this.actorService.deleteActorById(virtualContributorID);
    });

    virtualContributor.id = virtualContributorID;
    return virtualContributor;
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

  // Loads credentials (inherited from Actor via CTI) on the VirtualContributor.
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

  // Convenience method returning the VC along with its actorID and credentials.
  // VirtualContributor extends Actor, so actorID === virtualContributor.id
  async getVirtualContributorAndActor(virtualID: string): Promise<{
    virtualContributor: IVirtualContributor;
    actorID: string;
    credentials: ICredential[];
  }> {
    const virtualContributor =
      await this.getVirtualContributorWithCredentials(virtualID);

    return {
      virtualContributor,
      actorID: virtualContributor.id,
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
      `refreshing the body of knowledge ${virtualContributor.id}, by ${actorContext.actorID}`,
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
  private async deleteVCInvitations(actorID: string) {
    const invitations = await this.entityManager.find(Invitation, {
      where: { invitedActorID: actorID },
    });
    for (const invitation of invitations) {
      if (invitation.authorization) {
        await this.authorizationPolicyService.delete(invitation.authorization);
      }
      await this.entityManager.remove(invitation);
    }
  }
}
