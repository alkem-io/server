import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
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
import { INVP } from '@domain/common/nvp/nvp.interface';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines';

@Injectable()
export class SpaceAboutService {
  constructor(
    private spaceLookupService: SpaceLookupService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private profileService: ProfileService,
    private roleSetService: RoleSetService,
    @InjectRepository(SpaceAbout)
    private spaceAboutRepository: Repository<SpaceAbout>
  ) {}

  public async createSpaceAbout(
    spaceAboutData: CreateSpaceAboutInput,
    storageAggregator: IStorageAggregator
  ): Promise<ISpaceAbout> {
    const spaceAbout: ISpaceAbout = SpaceAbout.create({
      ...spaceAboutData,
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.SPACE),
    });
    spaceAbout.profile = await this.profileService.createProfile(
      spaceAboutData.profileData,
      ProfileType.SPACE_ABOUT,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(spaceAbout.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: spaceAboutData.profileData.tags,
    });

    const guidelinesInput: CreateCommunityGuidelinesInput = {
      // TODO: get this from defaults service, currently create with empty
      profile: {
        displayName: '',
        description: '',
      },
    };

    spaceAbout.guidelines =
      await this.communityGuidelinesService.createCommunityGuidelines(
        guidelinesInput,
        storageAggregator
      );

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
    const spaceAbout = await this.getSpaceAboutOrFail(spaceAboutInput.id, {
      relations: {
        profile: true,
      },
    });

    // preserve the why and who if not provided but update with empty string
    spaceAbout.why = spaceAboutUpdateData.why ?? spaceAbout.why;
    spaceAbout.who = spaceAboutUpdateData.who ?? spaceAbout.who;

    if (spaceAboutUpdateData.profile) {
      spaceAbout.profile = await this.profileService.updateProfile(
        spaceAbout.profile,
        spaceAboutUpdateData.profile
      );
    }

    return await this.spaceAboutRepository.save(spaceAbout);
  }

  async removeSpaceAbout(spaceAboutID: string): Promise<ISpaceAbout> {
    // Note need to load it in with all contained entities so can remove fully
    const spaceAbout = await this.getSpaceAboutOrFail(spaceAboutID, {
      relations: {
        profile: true,
        guidelines: true,
      },
    });

    if (!spaceAbout.profile || !spaceAbout.guidelines) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for SpaceAbout: ${spaceAboutID}`,
        LogContext.SPACE_ABOUT
      );
    }

    await this.profileService.deleteProfile(spaceAbout.profile.id);

    await this.communityGuidelinesService.deleteCommunityGuidelines(
      spaceAbout.guidelines.id
    );

    if (spaceAbout.authorization)
      await this.authorizationPolicyService.delete(spaceAbout.authorization);

    return await this.spaceAboutRepository.remove(spaceAbout as SpaceAbout);
  }

  public async getCommunityGuidelines(
    about: ISpaceAbout
  ): Promise<ICommunityGuidelines> {
    const communityWithGuidelines = await this.getSpaceAboutOrFail(about.id, {
      relations: { guidelines: true },
    });

    if (!communityWithGuidelines.guidelines) {
      throw new EntityNotInitializedException(
        `Unable to locate guidelines for community: ${about.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGuidelines.guidelines;
  }

  async getMetrics(spaceAbout: ISpaceAbout): Promise<INVP[]> {
    const metrics: INVP[] = [];

    const community = await this.getCommunityWithRoleSet(spaceAbout.id);
    const roleSet = community.roleSet;

    // Members
    const membersCount = await this.roleSetService.getMembersCount(roleSet);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${spaceAbout.id}`;
    metrics.push(membersTopic);

    return metrics;
  }

  public async getCommunityWithRoleSet(
    spaceAboutId: string
  ): Promise<ICommunity> {
    const subspaceWithCommunityRoleSet =
      await this.spaceLookupService.getSpaceForSpaceAboutOrFail(spaceAboutId, {
        relations: {
          community: {
            roleSet: true,
          },
        },
      });
    const community = subspaceWithCommunityRoleSet.community;
    if (!community || !community.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load community with RoleSet for space ${spaceAboutId} `,
        LogContext.COMMUNITY
      );
    }

    return community;
  }
}
