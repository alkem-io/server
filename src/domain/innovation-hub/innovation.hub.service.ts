import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ProfileService } from '@domain/common/profile/profile.service';
import { RestrictedTagsetNames } from '@domain/common/tagset';
import { VisualType } from '@common/enums/visual.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IInnovationHub, InnovationHub, InnovationHubType } from './types';
import { CreateInnovationHubInput, UpdateInnovationHubInput } from './dto';
import { InnovationHubAuthorizationService } from './innovation.hub.service.authorization';
import { SpaceService } from '@domain/challenge/space/space.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';

@Injectable()
export class InnovationHubService {
  constructor(
    @InjectRepository(InnovationHub)
    private readonly innovationHubRepository: Repository<InnovationHub>,
    private readonly profileService: ProfileService,
    private readonly authService: InnovationHubAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
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

    const space: IInnovationHub = InnovationHub.create(createData);
    space.authorization = new AuthorizationPolicy();

    space.profile = await this.profileService.createProfile(
      createData.profileData
    );

    await this.profileService.addTagsetOnProfile(space.profile, {
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualOnProfile(
      space.profile,
      VisualType.BANNER
    );

    await this.innovationHubRepository.save(space);

    return this.authService.applyAuthorizationPolicyAndSave(space);
  }

  public async updateOrFail(
    input: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const space: IInnovationHub = await this.getInnovationHubOrFail(
      {
        id: input.ID,
      },
      { relations: ['profile'] }
    );

    if (input.nameID) {
      if (input.nameID !== space.nameID) {
        const updateAllowed =
          await this.namingService.isInnovationHubNameIdAvailable(input.nameID);
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update Innovation Hub nameID: the provided nameID '${input.nameID}' is already taken`,
            LogContext.INNOVATION_HUB
          );
        }
        space.nameID = input.nameID;
      }
    }
    if (space.type === InnovationHubType.LIST && input.hubListFilter) {
      if (!input.hubListFilter.length) {
        throw new Error(
          `At least one Space needs to be provided for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }

      // validate spaces
      const trueOrList = await this.spaceService.spacesExist(
        input.hubListFilter
      );

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Spaces with the following identifiers not found: '${trueOrList.join(
            ','
          )}'`
        );
      }
      space.hubListFilter = input.hubListFilter;
    }
    if (
      space.type === InnovationHubType.VISIBILITY &&
      input.hubVisibilityFilter
    )
      space.hubVisibilityFilter = input.hubVisibilityFilter;
    if (input.profileData) {
      space.profile = await this.profileService.updateProfile(
        space.profile,
        input.profileData
      );
    }

    return await this.innovationHubRepository.save(space);
  }

  public async deleteOrFail(innovationHubID: string): Promise<IInnovationHub> {
    const space = await this.getInnovationHubOrFail(
      { id: innovationHubID },
      {
        relations: ['profile'],
      }
    );

    if (space.profile) {
      await this.profileService.deleteProfile(space.profile.id);
    }

    if (space.authorization)
      await this.authorizationPolicyService.delete(space.authorization);

    const result = await this.innovationHubRepository.remove(
      space as InnovationHub
    );
    result.id = innovationHubID;

    return result;
  }

  public getInnovationHubs(options?: FindManyOptions<InnovationHub>) {
    return this.innovationHubRepository.find(options);
  }

  public async getInnovationHubOrFail(
    args: { subdomain?: string; id?: string },
    options?: FindOneOptions<InnovationHub>
  ): Promise<InnovationHub | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hub');
    }

    const { id, subdomain } = args;

    const space = await this.innovationHubRepository.findOne({
      where: options?.where
        ? Array.isArray(options.where)
          ? [{ id }, { subdomain }, ...options.where]
          : [{ id }, { subdomain }, options.where]
        : [{ id }, { subdomain }],
      ...options,
    });

    if (!space) {
      throw new EntityNotFoundException(
        `Innovation space with id: '${id}' not found`,
        LogContext.INNOVATION_HUB
      );
    }

    return space;
  }

  public async getHubListFilterOrFail(
    spaceId: string
  ): Promise<string[] | undefined | never> {
    const space = await this.innovationHubRepository.findOneBy({
      id: spaceId,
    });

    if (!space) {
      throw new EntityNotFoundException(
        `Innovation Hub with id: '${spaceId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    if (space.type === InnovationHubType.LIST && !space.hubListFilter) {
      throw new EntityNotInitializedException(
        `Space list filter for Innovation Hub with id: '${spaceId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    return space.hubListFilter;
  }

  private async validateCreateInput({
    type,
    hubListFilter,
    hubVisibilityFilter,
  }: CreateInnovationHubInput): Promise<true | never> {
    if (type === InnovationHubType.LIST) {
      if (!hubListFilter || !hubListFilter.length) {
        throw new Error(
          `At least one Space needs to be provided for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }

      if (hubVisibilityFilter) {
        throw new Error(
          `Visibility filter not applicable for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }
      // validate spaces
      const trueOrList = await this.spaceService.spacesExist(hubListFilter);

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Spaces with the following identifiers not found: '${trueOrList.join(
            ','
          )}'`
        );
      }
    }

    if (type === InnovationHubType.VISIBILITY) {
      if (!hubVisibilityFilter) {
        throw new Error(
          `A visibility needs to be provided for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }

      if (hubListFilter && hubListFilter.length) {
        throw new Error(
          `List of Spaces not applicable for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }
    }

    return true;
  }
}
