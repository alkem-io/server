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
import { IInnovationHxb, InnovationHxb, InnovationHxbType } from './types';
import { CreateInnovationHxbInput, UpdateInnovationHxbInput } from './dto';
import { InnovationHxbAuthorizationService } from './innovation.hub.service.authorization';
import { HubService } from '@domain/challenge/hub/hub.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';

@Injectable()
export class InnovationHxbService {
  constructor(
    @InjectRepository(InnovationHxb)
    private readonly innovationHxbRepository: Repository<InnovationHxb>,
    private readonly profileService: ProfileService,
    private readonly authService: InnovationHxbAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly hubService: HubService,
    private namingService: NamingService
  ) {}

  public async createOrFail(
    createData: CreateInnovationHxbInput
  ): Promise<IInnovationHxb | never> {
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
      await this.namingService.isInnovationHxbSubdomainAvailable(
        createData.subdomain
      );
    if (!subdomainAvailable)
      throw new ValidationException(
        `Unable to create Innovation Hxb: the provided subdomain is already taken: ${createData.subdomain}`,
        LogContext.INNOVATION_HUB
      );

    if (createData.nameID && createData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isInnovationHxbNameIdAvailable(
          createData.nameID
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Innovation Hxb: the provided nameID is already taken: ${createData.nameID}`,
          LogContext.INNOVATION_HUB
        );
    } else {
      createData.nameID = this.namingService.createNameID(
        `${createData.profileData.displayName}`
      );
    }

    const hub: IInnovationHxb = InnovationHxb.create(createData);
    hub.authorization = new AuthorizationPolicy();

    hub.profile = await this.profileService.createProfile(
      createData.profileData
    );

    await this.profileService.addTagsetOnProfile(hub.profile, {
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualOnProfile(
      hub.profile,
      VisualType.BANNER
    );

    await this.innovationHxbRepository.save(hub);

    return this.authService.applyAuthorizationPolicyAndSave(hub);
  }

  public async updateOrFail(
    input: UpdateInnovationHxbInput
  ): Promise<IInnovationHxb> {
    const hub: IInnovationHxb = await this.getInnovationHxbOrFail(
      {
        id: input.ID,
      },
      { relations: ['profile'] }
    );

    if (input.nameID) {
      if (input.nameID !== hub.nameID) {
        const updateAllowed =
          await this.namingService.isInnovationHxbNameIdAvailable(input.nameID);
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update Innovation Hxb nameID: the provided nameID '${input.nameID}' is already taken`,
            LogContext.INNOVATION_HUB
          );
        }
        hub.nameID = input.nameID;
      }
    }
    if (hub.type === InnovationHxbType.LIST && input.hubListFilter) {
      if (!input.hubListFilter.length) {
        throw new Error(
          `At least one Hub needs to be provided for Innovation Hxb of type '${InnovationHxbType.LIST}'`
        );
      }

      // validate hubs
      const trueOrList = await this.hubService.hubsExist(input.hubListFilter);

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Hubs with the following identifiers not found: '${trueOrList.join(
            ','
          )}'`
        );
      }
      hub.hubListFilter = input.hubListFilter;
    }
    if (hub.type === InnovationHxbType.VISIBILITY && input.hubVisibilityFilter)
      hub.hubVisibilityFilter = input.hubVisibilityFilter;
    if (input.profileData) {
      hub.profile = await this.profileService.updateProfile(
        hub.profile,
        input.profileData
      );
    }

    return await this.innovationHxbRepository.save(hub);
  }

  public async deleteOrFail(innovationHxbID: string): Promise<IInnovationHxb> {
    const hub = await this.getInnovationHxbOrFail(
      { id: innovationHxbID },
      {
        relations: ['profile'],
      }
    );

    if (hub.profile) {
      await this.profileService.deleteProfile(hub.profile.id);
    }

    if (hub.authorization)
      await this.authorizationPolicyService.delete(hub.authorization);

    const result = await this.innovationHxbRepository.remove(
      hub as InnovationHxb
    );
    result.id = innovationHxbID;

    return result;
  }

  public getInnovationHxbs(options?: FindManyOptions<InnovationHxb>) {
    return this.innovationHxbRepository.find(options);
  }

  public async getInnovationHxbOrFail(
    args: { subdomain?: string; id?: string },
    options?: FindOneOptions<InnovationHxb>
  ): Promise<InnovationHxb | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hxb');
    }

    const { id, subdomain } = args;

    const hub = await this.innovationHxbRepository.findOne({
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
    const hub = await this.innovationHxbRepository.findOneBy({
      id: hubId,
    });

    if (!hub) {
      throw new EntityNotFoundException(
        `Innovation Hxb with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    if (hub.type === InnovationHxbType.LIST && !hub.hubListFilter) {
      throw new EntityNotInitializedException(
        `Space list filter for Innovation Hxb with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub.hubListFilter;
  }

  private async validateCreateInput({
    type,
    hubListFilter,
    hubVisibilityFilter,
  }: CreateInnovationHxbInput): Promise<true | never> {
    if (type === InnovationHxbType.LIST) {
      if (!hubListFilter || !hubListFilter.length) {
        throw new Error(
          `At least one Hub needs to be provided for Innovation Hxb of type '${InnovationHxbType.LIST}'`
        );
      }

      if (hubVisibilityFilter) {
        throw new Error(
          `Visibility filter not applicable for Innovation Hxb of type '${InnovationHxbType.LIST}'`
        );
      }
      // validate hubs
      const trueOrList = await this.hubService.hubsExist(hubListFilter);

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Hubs with the following identifiers not found: '${trueOrList.join(
            ','
          )}'`
        );
      }
    }

    if (type === InnovationHxbType.VISIBILITY) {
      if (!hubVisibilityFilter) {
        throw new Error(
          `A visibility needs to be provided for Innovation Hxb of type '${InnovationHxbType.VISIBILITY}'`
        );
      }

      if (hubListFilter && hubListFilter.length) {
        throw new Error(
          `List of Hubs not applicable for Innovation Hxb of type '${InnovationHxbType.VISIBILITY}'`
        );
      }
    }

    return true;
  }
}
