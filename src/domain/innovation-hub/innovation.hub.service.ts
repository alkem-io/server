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
import { CreateInnovationHubInput } from './dto';
import { InnovationHubAuthorizationService } from './innovation.hub.service.authorization';

@Injectable()
export class InnovationHubService {
  constructor(
    @InjectRepository(InnovationHub)
    private readonly hubRepo: Repository<InnovationHub>,
    private readonly profileService: ProfileService,
    private readonly authService: InnovationHubAuthorizationService
  ) {}

  public async create(
    input: CreateInnovationHubInput
  ): Promise<IInnovationHub> {
    try {
      tryValidateCreateInput(input);
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

    hub.profile = await this.profileService.createProfile(input.profileData);

    await this.profileService.addTagsetOnProfile(hub.profile, {
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualOnProfile(
      hub.profile,
      VisualType.BANNER
    );

    await this.hubRepo.save(hub);

    return this.authService.applyAuthorizationPolicyAndSave(hub);
  }

  public getInnovationHubs(options?: FindManyOptions<InnovationHub>) {
    return this.hubRepo.find(options);
  }

  public async getInnovationHubOrFail(
    args: { subdomain?: string; id?: string },
    options?: FindOneOptions<InnovationHub>
  ): Promise<InnovationHub | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hub');
    }

    const { id, subdomain } = args;

    const hub = await this.hubRepo.findOne({
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
    const hub = await this.hubRepo.findOneBy({
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

const tryValidateCreateInput = ({
  type,
  hubListFilter,
  hubVisibilityFilter,
}: CreateInnovationHubInput): true | never => {
  if (type === InnovationHubType.LIST) {
    if (!hubListFilter || !hubListFilter.length) {
      throw new Error(
        `At least one Hub needs to provided for Innovation Hub of type '${InnovationHubType.LIST}'`
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
