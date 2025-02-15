import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateSpaceAboutInput } from './dto/space.about.dto.update';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ProfileService } from '@domain/common/profile/profile.service';
import { SpaceAbout } from './space.about.entity';
import { CreateSpaceAboutInput } from './dto/space.about.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ISpaceAbout } from './space.about.interface';

@Injectable()
export class SpaceAboutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    @InjectRepository(SpaceAbout)
    private spaceAboutRepository: Repository<SpaceAbout>
  ) {}

  public async createSpaceAbout(
    spaceAboutData: CreateSpaceAboutInput,
    profileType: ProfileType,
    storageAggregator: IStorageAggregator
  ): Promise<ISpaceAbout> {
    const spaceAbout: ISpaceAbout = SpaceAbout.create({
      ...spaceAboutData,
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.SPACE),
    });
    spaceAbout.profile = await this.profileService.createProfile(
      spaceAboutData.profileData,
      profileType,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(spaceAbout.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: spaceAboutData.tags,
    });

    // add the visuals
    await this.profileService.addVisualsOnProfile(
      spaceAbout.profile,
      spaceAboutData.profileData.visuals,
      [VisualType.AVATAR, VisualType.BANNER, VisualType.CARD]
    );
    return await this.spaceAboutRepository.save(spaceAbout);
  }

  async getSpaceAboutOrFail(
    spaceAboutID: string,
    options?: FindOneOptions<SpaceAbout>
  ): Promise<ISpaceAbout | never> {
    const spaceAbout = await this.spaceAboutRepository.findOne({
      where: { id: spaceAboutID },
      ...options,
    });
    if (!spaceAbout)
      throw new EntityNotFoundException(
        `No SpaceAbout found with the given id: ${spaceAboutID}`,
        LogContext.SPACE_ABOUT
      );
    return spaceAbout;
  }

  async updateSpaceAbout(
    spaceAboutInput: ISpaceAbout,
    spaceAboutUpdateData: UpdateSpaceAboutInput
  ): Promise<ISpaceAbout> {
    const spaceAbout = await this.getSpaceAboutOrFail(spaceAboutInput.id);
    if (spaceAboutUpdateData.vision) {
      spaceAbout.why = spaceAboutUpdateData.vision;
    }
    if (spaceAboutUpdateData.impact) {
      spaceAbout.when = spaceAboutUpdateData.impact;
    }
    if (spaceAboutUpdateData.who) {
      spaceAbout.who = spaceAboutUpdateData.who;
    }

    return await this.spaceAboutRepository.save(spaceAbout);
  }

  async removeSpaceAbout(spaceAboutID: string): Promise<ISpaceAbout> {
    // Note need to load it in with all contained entities so can remove fully
    const spaceAbout = await this.getSpaceAboutOrFail(spaceAboutID, {
      relations: {
        profile: true,
      },
    });

    if (!spaceAbout.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for SpaceAbout: ${spaceAboutID}`,
        LogContext.SPACE_ABOUT
      );
    }

    await this.profileService.deleteProfile(spaceAbout.profile.id);

    if (spaceAbout.authorization)
      await this.authorizationPolicyService.delete(spaceAbout.authorization);

    return await this.spaceAboutRepository.remove(spaceAbout as SpaceAbout);
  }
}
