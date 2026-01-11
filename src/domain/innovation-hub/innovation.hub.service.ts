import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IInnovationHub, InnovationHub, InnovationHubType } from './types';
import { CreateInnovationHubInput, UpdateInnovationHubInput } from './dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IAccount } from '@domain/space/account/account.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';

@Injectable()
export class InnovationHubService {
  constructor(
    @InjectRepository(InnovationHub)
    private readonly innovationHubRepository: Repository<InnovationHub>,
    private readonly profileService: ProfileService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly spaceLookupService: SpaceLookupService,
    private namingService: NamingService,
    private accountLookupService: AccountLookupService
  ) {}

  public async createInnovationHub(
    createData: CreateInnovationHubInput,
    account: IAccount
  ): Promise<IInnovationHub | never> {
    try {
      await this.validateCreateInput(createData);
    } catch (e) {
      const err = e as Error;
      throw new ValidationException(
        `Incorrect input provided: ${err.message}`,
        LogContext.INNOVATION_HUB
      );
    }

    if (!account.storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to load storage aggregator on account for creating innovation Hub: ${account.id}`,
        LogContext.ACCOUNT
      );
    }

    const subdomainAvailable =
      await this.namingService.isInnovationHubSubdomainAvailable(
        createData.subdomain
      );
    if (!subdomainAvailable)
      throw new ValidationException(
        `Unable to create Innovation Hub: the provided subdomain is already taken: ${createData.subdomain}`,
        LogContext.INNOVATION_HUB
      );

    const reservedNameIDs = await this.namingService.getReservedNameIDsInHubs();
    if (createData.nameID && createData.nameID.length > 0) {
      const nameTaken = reservedNameIDs.includes(createData.nameID);
      if (nameTaken)
        throw new ValidationException(
          `Unable to create Innovation Hub: the provided nameID is already taken: ${createData.nameID}`,
          LogContext.INNOVATION_HUB
        );
    } else {
      createData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${createData.profileData.displayName}`,
          reservedNameIDs
        );
    }

    const hub: IInnovationHub = InnovationHub.create(createData);
    hub.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_HUB
    );
    hub.listedInStore = true;
    hub.searchVisibility = SearchVisibility.ACCOUNT;
    hub.account = account;

    hub.profile = await this.profileService.createProfile(
      createData.profileData,
      ProfileType.INNOVATION_HUB,
      account.storageAggregator
    );

    await this.profileService.addOrUpdateTagsetOnProfile(hub.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualsOnProfile(
      hub.profile,
      createData.profileData.visuals,
      [VisualType.BANNER_WIDE]
    );

    return await this.save(hub);
  }

  public save(hub: IInnovationHub): Promise<IInnovationHub> {
    return this.innovationHubRepository.save(hub);
  }

  public async updateOrFail(
    input: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub: IInnovationHub = await this.getInnovationHubOrFail(
      input.ID,
      { relations: { profile: true } }
    );

    if (input.nameID) {
      if (input.nameID !== innovationHub.nameID) {
        const reservedNameIDs =
          await this.namingService.getReservedNameIDsInHubs();
        const nameTaken = reservedNameIDs.includes(input.nameID);
        if (nameTaken) {
          throw new ValidationException(
            `Unable to update Innovation Hub nameID: the provided nameID '${input.nameID}' is already taken`,
            LogContext.INNOVATION_HUB
          );
        }
        innovationHub.nameID = input.nameID;
      }
    }
    if (
      innovationHub.type === InnovationHubType.LIST &&
      input.spaceListFilter
    ) {
      if (!input.spaceListFilter.length) {
        throw new Error(
          `At least one Space needs to be provided for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }

      // validate spaces
      const trueOrList = await this.spaceLookupService.spacesExist(
        input.spaceListFilter
      );

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Spaces with the following identifiers not found: '${trueOrList.join(
            ','
          )}'`
        );
      }
      innovationHub.spaceListFilter = input.spaceListFilter;
    }
    if (
      innovationHub.type === InnovationHubType.VISIBILITY &&
      input.spaceVisibilityFilter
    )
      innovationHub.spaceVisibilityFilter = input.spaceVisibilityFilter;
    if (input.profileData) {
      innovationHub.profile = await this.profileService.updateProfile(
        innovationHub.profile,
        input.profileData
      );
    }
    if (typeof input.listedInStore === 'boolean') {
      innovationHub.listedInStore = !!input.listedInStore;
    }

    if (input.searchVisibility) {
      innovationHub.searchVisibility = input.searchVisibility;
    }

    return await this.save(innovationHub);
  }

  public async delete(innovationHubID: string): Promise<IInnovationHub> {
    const hub = await this.getInnovationHubOrFail(innovationHubID, {
      relations: { profile: true },
    });

    if (hub.profile) {
      await this.profileService.deleteProfile(hub.profile.id);
    }

    if (hub.authorization)
      await this.authorizationPolicyService.delete(hub.authorization);

    const result = await this.innovationHubRepository.remove(
      hub as InnovationHub
    );
    result.id = innovationHubID;

    return result;
  }

  public getInnovationHubs(options?: FindManyOptions<InnovationHub>) {
    return this.innovationHubRepository.find(options);
  }

  public async getInnovationHubOrFail(
    innovationHubID: string,
    options?: FindOneOptions<InnovationHub>
  ): Promise<IInnovationHub> {
    const innovationHub = await this.innovationHubRepository.findOne({
      where: { id: innovationHubID },
      ...options,
    });

    if (!innovationHub)
      throw new EntityNotFoundException(
        `Unable to find InnovationHub with ID: ${innovationHubID}`,
        LogContext.SPACES
      );
    return innovationHub;
  }

  public async getInnovationHubByNameIdOrFail(
    innovationHubNameID: string,
    options?: FindOneOptions<InnovationHub>
  ): Promise<IInnovationHub> {
    const innovationHub = await this.innovationHubRepository.findOne({
      where: { nameID: innovationHubNameID },
      ...options,
    });

    if (!innovationHub)
      throw new EntityNotFoundException(
        `Unable to find InnovationHub with NameID: ${innovationHubNameID}`,
        LogContext.SPACES
      );
    return innovationHub;
  }

  public async getInnovationHubFlexOrFail(
    args: { subdomain?: string; idOrNameId?: string },
    options?: FindOneOptions<InnovationHub>
  ): Promise<InnovationHub | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hub');
    }

    const { idOrNameId, subdomain } = args;

    const whereArgs = [
      { id: idOrNameId },
      { nameID: idOrNameId },
      { subdomain },
    ];

    const innovationHub = await this.innovationHubRepository.findOne({
      where: options?.where
        ? Array.isArray(options.where)
          ? [...whereArgs, ...options.where]
          : [...whereArgs, options.where]
        : [{ id: idOrNameId }, { subdomain }, { nameID: idOrNameId }],
      ...options,
    });

    if (!innovationHub) {
      throw new EntityNotFoundException(
        `Innovation hub '${idOrNameId}' not found`,
        LogContext.INNOVATION_HUB
      );
    }

    return innovationHub;
  }

  public async getSpaceListFilterOrFail(
    hubId: string
  ): Promise<string[] | undefined | never> {
    const hub = await this.innovationHubRepository.findOneBy({
      id: hubId,
    });

    if (!hub) {
      throw new EntityNotFoundException(
        `Innovation Hub with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub.spaceListFilter;
  }

  private async validateCreateInput({
    type,
    spaceListFilter,
    spaceVisibilityFilter,
  }: CreateInnovationHubInput): Promise<true | never> {
    if (type === InnovationHubType.LIST) {
      if (spaceVisibilityFilter) {
        throw new Error(
          `Visibility filter not applicable for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }
      if (spaceListFilter && spaceListFilter.length) {
        // If specified on create, validate spaces
        const trueOrList =
          await this.spaceLookupService.spacesExist(spaceListFilter);

        if (Array.isArray(trueOrList)) {
          throw new Error(
            `Spaces with the following identifiers not found: '${trueOrList.join(
              ','
            )}'`
          );
        }
      }
    }

    if (type === InnovationHubType.VISIBILITY) {
      if (!spaceVisibilityFilter) {
        throw new Error(
          `A visibility needs to be provided for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }

      if (spaceListFilter && spaceListFilter.length) {
        throw new Error(
          `List of Spaces not applicable for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }
    }

    return true;
  }

  public async getProvider(innovationHubID: string): Promise<IActor> {
    const innovationHub = await this.innovationHubRepository.findOne({
      where: { id: innovationHubID },
      relations: {
        account: true,
      },
    });
    if (!innovationHub || !innovationHub.account) {
      throw new RelationshipNotFoundException(
        `Unable to load innovation Hub with account to get Provider ${innovationHubID} `,
        LogContext.LIBRARY
      );
    }
    const provider = await this.accountLookupService.getHost(
      innovationHub.account
    );
    if (!provider) {
      throw new RelationshipNotFoundException(
        `Unable to load provider for InnovationHub ${innovationHubID} `,
        LogContext.LIBRARY
      );
    }
    return provider;
  }
}
