import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { SearchVisibility } from '@common/enums/search.visibility';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateInnovationPackInput } from './dto/innovation.pack.dto.create';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';
import { InnovationPackDefaultsService } from './innovation.pack.defaults/innovation.pack.defaults.service';
import { InnovationPack } from './innovation.pack.entity';
import { IInnovationPack } from './innovation.pack.interface';
import { innovationPacks } from './innovation.pack.schema';

@Injectable()
export class InnovationPackService {
  constructor(
    private profileService: ProfileService,
    private templatesSetService: TemplatesSetService,
    private accountLookupService: AccountLookupService,
    private innovationPackDefaultsService: InnovationPackDefaultsService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  private async checkNameIdOrFail(nameID: string) {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(innovationPacks)
      .where(eq(innovationPacks.nameID, nameID));
    const innovationPackCount = Number(result[0]?.count || 0);
    if (innovationPackCount >= 1)
      throw new ValidationException(
        `InnovationPack: the provided nameID is already taken: ${nameID}`,
        LogContext.LIBRARY
      );
  }

  async createInnovationPack(
    innovationPackData: CreateInnovationPackInput,
    storageAggregator: IStorageAggregator
  ): Promise<IInnovationPack> {
    if (innovationPackData.nameID) {
      // Convert nameID to lower case
      innovationPackData.nameID = innovationPackData.nameID.toLowerCase();
      await this.checkNameIdOrFail(innovationPackData.nameID);
    } else {
      innovationPackData.nameID =
        await this.innovationPackDefaultsService.createVirtualContributorNameID(
          innovationPackData.profileData?.displayName || ''
        );
    }

    const innovationPack: IInnovationPack =
      InnovationPack.create(innovationPackData);
    innovationPack.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_PACK
    );

    innovationPack.profile = await this.profileService.createProfile(
      innovationPackData.profileData,
      ProfileType.INNOVATION_PACK,
      storageAggregator
    );
    await this.profileService.addVisualsOnProfile(
      innovationPack.profile,
      innovationPackData.profileData.visuals,
      [VisualType.AVATAR, VisualType.CARD]
    );

    innovationPack.listedInStore = true;
    innovationPack.searchVisibility = SearchVisibility.ACCOUNT;

    await this.profileService.addOrUpdateTagsetOnProfile(
      innovationPack.profile,
      {
        name: TagsetReservedName.DEFAULT,
        tags: innovationPackData.tags ?? [],
      }
    );

    innovationPack.templatesSet =
      await this.templatesSetService.createTemplatesSet();

    return await this.save(innovationPack);
  }

  async save(innovationPack: IInnovationPack): Promise<IInnovationPack> {
    if (innovationPack.id) {
      const [updated] = await this.db
        .update(innovationPacks)
        .set({
          nameID: innovationPack.nameID,
          listedInStore: innovationPack.listedInStore,
          searchVisibility: innovationPack.searchVisibility,
          profileId: innovationPack.profile?.id,
          templatesSetId: innovationPack.templatesSet?.id,
          accountId: innovationPack.account?.id,
          authorizationId: innovationPack.authorization?.id,
        })
        .where(eq(innovationPacks.id, innovationPack.id))
        .returning();
      return updated as unknown as IInnovationPack;
    }
    const [created] = await this.db
      .insert(innovationPacks)
      .values({
        nameID: innovationPack.nameID,
        listedInStore: innovationPack.listedInStore,
        searchVisibility: innovationPack.searchVisibility,
        profileId: innovationPack.profile?.id,
        templatesSetId: innovationPack.templatesSet?.id,
        accountId: innovationPack.account?.id,
        authorizationId: innovationPack.authorization?.id,
      })
      .returning();
    return created as unknown as IInnovationPack;
  }

  async update(
    innovationPackData: UpdateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackData.ID,
      {
        with: { profile: true },
      }
    );

    if (innovationPackData.nameID) {
      if (innovationPackData.nameID !== innovationPack.nameID) {
        // updating the nameID, check new value is allowed
        const updateAllowed = await this.isNameIdAvailable(
          innovationPackData.nameID
        );
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update InnovationPack nameID: the provided nameID is already taken: ${innovationPackData.nameID}`,
            LogContext.SPACES
          );
        }
        innovationPack.nameID = innovationPackData.nameID;
      }
    }

    if (innovationPackData.profileData) {
      innovationPack.profile = await this.profileService.updateProfile(
        innovationPack.profile,
        innovationPackData.profileData
      );
    }

    if (typeof innovationPackData.listedInStore === 'boolean') {
      innovationPack.listedInStore = !!innovationPackData.listedInStore;
    }

    if (innovationPackData.searchVisibility) {
      innovationPack.searchVisibility = innovationPackData.searchVisibility;
    }

    return await this.save(innovationPack);
  }

  async deleteInnovationPack(
    deleteData: DeleteInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack = await this.getInnovationPackOrFail(deleteData.ID, {
      with: { templatesSet: true, profile: true },
    });

    if (innovationPack.templatesSet) {
      await this.templatesSetService.deleteTemplatesSet(
        innovationPack.templatesSet.id
      );
    }

    if (innovationPack.profile) {
      await this.profileService.deleteProfile(innovationPack.profile.id);
    }

    await this.db.delete(innovationPacks).where(eq(innovationPacks.id, deleteData.ID));
    innovationPack.id = deleteData.ID;
    return innovationPack;
  }

  async getInnovationPackOrFail(
    innovationPackID: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IInnovationPack | never> {
    const innovationPack = await this.db.query.innovationPacks.findFirst({
      where: eq(innovationPacks.id, innovationPackID),
      with: options?.with,
    });

    if (!innovationPack)
      throw new EntityNotFoundException(
        `Unable to find InnovationPack with ID: ${innovationPackID}`,
        LogContext.LIBRARY
      );
    return innovationPack as unknown as IInnovationPack;
  }

  async getInnovationPackByNameIdOrFail(
    innovationPackNameID: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IInnovationPack | never> {
    const innovationPack = await this.db.query.innovationPacks.findFirst({
      where: eq(innovationPacks.nameID, innovationPackNameID),
      with: options?.with,
    });

    if (!innovationPack)
      throw new EntityNotFoundException(
        `Unable to find InnovationPack using NameID: ${innovationPackNameID}`,
        LogContext.LIBRARY
      );
    return innovationPack as unknown as IInnovationPack;
  }

  public async getProfile(
    innovationPackInput: IInnovationPack,
    additionalWith?: Record<string, boolean>
  ): Promise<IProfile> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackInput.id,
      {
        with: { profile: true, ...additionalWith },
      }
    );
    if (!innovationPack.profile)
      throw new EntityNotFoundException(
        `InnovationPack profile not initialised: ${innovationPack.id}`,
        LogContext.COLLABORATION
      );

    return innovationPack.profile;
  }
  async getTemplatesSetOrFail(
    innovationPackId: string
  ): Promise<ITemplatesSet> {
    const innovationPackWithTemplates = await this.getInnovationPackOrFail(
      innovationPackId,
      {
        with: { templatesSet: true },
      }
    );
    const templatesSet = innovationPackWithTemplates.templatesSet;

    if (!templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for innovationPack with nameID: ${innovationPackWithTemplates.id}`,
        LogContext.COMMUNITY
      );
    }

    return templatesSet;
  }

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(innovationPacks)
      .where(eq(innovationPacks.nameID, nameID));
    return Number(result[0]?.count || 0) === 0;
  }

  async getTemplatesCount(innovationPackID: string): Promise<number> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackID,
      {
        with: {
          templatesSet: true,
        },
      }
    );
    const templatesSetId = innovationPack.templatesSet?.id;
    if (!templatesSetId) {
      throw new EntityNotFoundException(
        `TemplatesSet for InnovationPack ${innovationPackID} not found!`,
        LogContext.SPACES
      );
    }
    return await this.templatesSetService.getTemplatesCount(templatesSetId);
  }

  public async getProvider(innovationPackID: string): Promise<IContributor> {
    const innovationPack = await this.db.query.innovationPacks.findFirst({
      where: eq(innovationPacks.id, innovationPackID),
      with: {
        account: true,
      },
    });
    if (!innovationPack || !innovationPack.account) {
      throw new RelationshipNotFoundException(
        `Unable to load innovation pack with account to get Provider for InnovationPack ${innovationPackID} `,
        LogContext.LIBRARY
      );
    }
    const provider = await this.accountLookupService.getHost(
      innovationPack.account as any
    );
    if (!provider) {
      throw new RelationshipNotFoundException(
        `Unable to load provider for InnovationPack ${innovationPackID} `,
        LogContext.LIBRARY
      );
    }
    return provider;
  }
}
