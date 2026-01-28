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
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CreateInnovationPackInput } from './dto/innovation.pack.dto.create';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';
import { InnovationPackDefaultsService } from './innovation.pack.defaults/innovation.pack.defaults.service';
import { InnovationPack } from './innovation.pack.entity';
import { IInnovationPack } from './innovation.pack.interface';

@Injectable()
export class InnovationPackService {
  constructor(
    private profileService: ProfileService,
    private templatesSetService: TemplatesSetService,
    private accountLookupService: AccountLookupService,
    private innovationPackDefaultsService: InnovationPackDefaultsService,
    @InjectRepository(InnovationPack)
    private innovationPackRepository: Repository<InnovationPack>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  private async checkNameIdOrFail(nameID: string) {
    const innovationPackCount = await this.innovationPackRepository.countBy({
      nameID: nameID,
    });
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
    return await this.innovationPackRepository.save(innovationPack);
  }

  async update(
    innovationPackData: UpdateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackData.ID,
      {
        relations: { profile: true },
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
      relations: { templatesSet: true, profile: true },
    });

    if (innovationPack.templatesSet) {
      await this.templatesSetService.deleteTemplatesSet(
        innovationPack.templatesSet.id
      );
    }

    if (innovationPack.profile) {
      await this.profileService.deleteProfile(innovationPack.profile.id);
    }

    const result = await this.innovationPackRepository.remove(
      innovationPack as InnovationPack
    );
    result.id = deleteData.ID;
    return result;
  }

  async getInnovationPackOrFail(
    innovationPackID: string,
    options?: FindOneOptions<InnovationPack>
  ): Promise<IInnovationPack | never> {
    const innovationPack = await this.innovationPackRepository.findOne({
      where: { id: innovationPackID },
      ...options,
    });

    if (!innovationPack)
      throw new EntityNotFoundException(
        `Unable to find InnovationPack with ID: ${innovationPackID}`,
        LogContext.LIBRARY
      );
    return innovationPack;
  }

  async getInnovationPackByNameIdOrFail(
    innovationPackNameID: string,
    options?: FindOneOptions<InnovationPack>
  ): Promise<IInnovationPack | never> {
    const innovationPack = await this.innovationPackRepository.findOne({
      where: { nameID: innovationPackNameID },
      ...options,
    });

    if (!innovationPack)
      throw new EntityNotFoundException(
        `Unable to find InnovationPack using NameID: ${innovationPackNameID}`,
        LogContext.LIBRARY
      );
    return innovationPack;
  }

  public async getProfile(
    innovationPackInput: IInnovationPack,
    relations?: FindOptionsRelations<IInnovationPack>
  ): Promise<IProfile> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackInput.id,
      {
        relations: { profile: true, ...relations },
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
        relations: { templatesSet: true },
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
    const innovationPackCount = await this.innovationPackRepository.countBy({
      nameID: nameID,
    });
    return innovationPackCount == 0;
  }

  async getTemplatesCount(innovationPackID: string): Promise<number> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackID,
      {
        relations: {
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
    const innovationPack = await this.innovationPackRepository.findOne({
      where: { id: innovationPackID },
      relations: {
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
      innovationPack.account
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
