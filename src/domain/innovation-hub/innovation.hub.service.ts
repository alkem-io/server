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
import { IInnovationHub, InnovationHub, InnovationHubType } from './';
import { CreateInnovationHubInput, UpdateInnovationHubInput } from './dto';
import { InnovationHubAuthorizationService } from './innovation.hub.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class InnovationHubService {
  constructor(
    @InjectRepository(InnovationHub)
    private readonly innovationHubRepository: Repository<InnovationHub>,
    private readonly profileService: ProfileService,
    private readonly authService: InnovationHubAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService
  ) {}

  public async create(
    input: CreateInnovationHubInput
  ): Promise<IInnovationHub> {
    try {
      validateCreateOrUpdateInput(input);
    } catch (e) {
      const err = e as Error;
      throw new ValidationException(
        `Incorrect input provided: ${err.message}`,
        LogContext.INNOVATION_HUB
      );
    }

    const hub: IInnovationHub = InnovationHub.create(input);
    hub.authorization = new AuthorizationPolicy();

    // todo: validate hubs input
    // what happens when a hub gets deleted?

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

  public async update(
    input: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    try {
      validateCreateOrUpdateInput(input);
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

    // todo: validate hubs input
    // what happens when a hub gets deleted?

    if (input.profileData) {
      hub.profile = await this.profileService.updateProfile(
        hub.profile,
        input.profileData
      );
    }

    return await this.innovationHubRepository.save(hub);
  }

  public async delete(innovationHubID: string): Promise<IInnovationHub> {
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
      where: {
        ...options?.where,
        id,
        subdomain,
      },
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
}

const validateCreateOrUpdateInput = ({
  type,
  hubListFilter,
  hubVisibilityFilter,
}: CreateInnovationHubInput | UpdateInnovationHubInput): true | never => {
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
};
