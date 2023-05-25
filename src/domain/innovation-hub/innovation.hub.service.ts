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
import { HubService } from '@domain/challenge/hub/hub.service';
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
    private readonly spaceService: HubService,
    private namingService: NamingService
  ) {}

  public async createOrFail(
    input: CreateInnovationHubInput
  ): Promise<IInnovationHub | never> {
    try {
      await this.validateCreateOrUpdateInput(input);
    } catch (e) {
      const err = e as Error;
      throw new ValidationException(
        `Incorrect input provided: ${err.message}`,
        LogContext.INNOVATION_HUB
      );
    }

    const subdomainAvailable =
      await this.namingService.isInnovationSpaceSubdomainAvailable(
        input.subdomain
      );
    if (!subdomainAvailable)
      throw new ValidationException(
        `Unable to create Innovation Space: the provided subdomain is already taken: ${input.subdomain}`,
        LogContext.INNOVATION_HUB
      );

    if (input.nameID && input.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isInnovationSpaceNameIdAvailable(input.nameID);
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Innovation Space: the provided nameID is already taken: ${input.nameID}`,
          LogContext.INNOVATION_HUB
        );
    } else {
      input.nameID = this.namingService.createNameID(
        `${input.profileData.displayName}`
      );
    }

    const displayNameAvailable =
      await this.namingService.isInnovationSpaceDisplayNameAvailable(
        input.profileData.displayName
      );
    if (!displayNameAvailable)
      throw new ValidationException(
        `Unable to create Innovation Space: the provided displayName is already taken: ${input.profileData.displayName}`,
        LogContext.INNOVATION_HUB
      );

    const hub: IInnovationHub = InnovationHub.create(input);
    hub.authorization = new AuthorizationPolicy();

    hub.profile = await this.profileService.createProfile(input.profileData);

    await this.profileService.addTagsetOnProfile(hub.profile, {
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualOnProfile(
      hub.profile,
      VisualType.BANNER
    );

    await this.innovationHubRepository.save(hub);

    return this.authService.applyAuthorizationPolicyAndSave(hub);
  }

  public async updateOrFail(
    input: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    try {
      await this.validateCreateOrUpdateInput(input);
    } catch (e) {
      const err = e as Error;
      throw new ValidationException(
        `Incorrect input provided: ${err.message}`,
        LogContext.INNOVATION_HUB
      );
    }

    const hub: IInnovationHub = await this.getInnovationHubOrFail({
      id: input.ID,
    });

    if (input.profileData) {
      hub.profile = await this.profileService.updateProfile(
        hub.profile,
        input.profileData
      );
    }

    return await this.innovationHubRepository.save(hub);
  }

  public async deleteOrFail(innovationHubID: string): Promise<IInnovationHub> {
    const hub = await this.getInnovationHubOrFail(
      { id: innovationHubID },
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
    args: { subdomain?: string; id?: string },
    options?: FindOneOptions<InnovationHub>
  ): Promise<InnovationHub | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hub');
    }

    const { id, subdomain } = args;

    const hub = await this.innovationHubRepository.findOne({
      where: options?.where
        ? Array.isArray(options.where)
          ? [{ id }, { subdomain }, ...options.where]
          : [{ id }, { subdomain }, options.where]
        : [{ id }, { subdomain }],
      ...options,
    });

    if (!hub) {
      throw new EntityNotFoundException(
        `Innovation hub with id: '${id}' not found`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub;
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

    if (hub.type === InnovationHubType.LIST && !hub.hubListFilter) {
      throw new EntityNotInitializedException(
        `Space list filter for Innovation Hub with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub.hubListFilter;
  }

  private async validateCreateOrUpdateInput({
    type,
    hubListFilter,
    hubVisibilityFilter,
  }: CreateInnovationHubInput | UpdateInnovationHubInput): Promise<
    true | never
  > {
    if (type === InnovationHubType.LIST) {
      if (!hubListFilter || !hubListFilter.length) {
        throw new Error(
          `At least one Hub needs to be provided for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }

      if (hubVisibilityFilter) {
        throw new Error(
          `Visibility filter not applicable for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }
      // validate hubs
      const trueOrList = await this.spaceService.hubsExist(hubListFilter);

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Hubs with the following identifiers not found: '${trueOrList.join(
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
          `List of Hubs not applicable for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }
    }

    return true;
  }
}
