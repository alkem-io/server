import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IInnovationHub, InnovationHub, InnovationHubType } from './types';
import { CreateInnovationHubInput, UpdateInnovationHubInput } from './dto';
import { InnovationHubAuthorizationService } from './innovation.hub.service.authorization';
import { SpaceService } from '@domain/challenge/space/space.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { StorageBucketResolverService } from '@services/infrastructure/storage-bucket-resolver/storage.bucket.resolver.service';

@Injectable()
export class InnovationHubService {
  constructor(
    @InjectRepository(InnovationHub)
    private readonly innovationHubRepository: Repository<InnovationHub>,
    private readonly profileService: ProfileService,
    private readonly authService: InnovationHubAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketResolverService: StorageBucketResolverService,
    private readonly spaceService: SpaceService,
    private namingService: NamingService
  ) {}

  public async createOrFail(
    createData: CreateInnovationHubInput
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

    const subdomainAvailable =
      await this.namingService.isInnovationHubSubdomainAvailable(
        createData.subdomain
      );
    if (!subdomainAvailable)
      throw new ValidationException(
        `Unable to create Innovation Hub: the provided subdomain is already taken: ${createData.subdomain}`,
        LogContext.INNOVATION_HUB
      );

    if (createData.nameID && createData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isInnovationHubNameIdAvailable(
          createData.nameID
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Innovation Hub: the provided nameID is already taken: ${createData.nameID}`,
          LogContext.INNOVATION_HUB
        );
    } else {
      createData.nameID = this.namingService.createNameID(
        `${createData.profileData.displayName}`
      );
    }

    const hub: IInnovationHub = InnovationHub.create(createData);
    hub.authorization = new AuthorizationPolicy();

    const storageBucket =
      await this.storageBucketResolverService.getPlatformStorageBucket();

    hub.profile = await this.profileService.createProfile(
      createData.profileData,
      storageBucket
    );

    await this.profileService.addTagsetOnProfile(hub.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualOnProfile(
      hub.profile,
      VisualType.BANNER_WIDE
    );

    await this.innovationHubRepository.save(hub);

    return this.authService.applyAuthorizationPolicyAndSave(hub);
  }

  public async updateOrFail(
    input: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub: IInnovationHub = await this.getInnovationHubOrFail(
      {
        idOrNameId: input.ID,
      },
      { relations: ['profile'] }
    );

    if (input.nameID) {
      if (input.nameID !== innovationHub.nameID) {
        const updateAllowed =
          await this.namingService.isInnovationHubNameIdAvailable(input.nameID);
        if (!updateAllowed) {
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
      const trueOrList = await this.spaceService.spacesExist(
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

    return await this.innovationHubRepository.save(innovationHub);
  }

  public async deleteOrFail(innovationHubID: string): Promise<IInnovationHub> {
    const hub = await this.getInnovationHubOrFail(
      { idOrNameId: innovationHubID },
      {
        relations: ['profile'],
      }
    );

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
        const trueOrList = await this.spaceService.spacesExist(spaceListFilter);

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
}
