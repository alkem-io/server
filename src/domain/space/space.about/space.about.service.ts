import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { CreateVisualOnProfileInput } from '@domain/common/profile/dto/profile.dto.create.visual';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CreateTagsetInput, ITagset } from '@domain/common/tagset';
import { IVisual } from '@domain/common/visual';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import { ICommunity } from '@domain/community/community/community.interface';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { FindOneOptions, Repository } from 'typeorm';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { CreateSpaceAboutInput } from './dto/space.about.dto.create';
import { UpdateSpaceAboutInput } from './dto/space.about.dto.update';
import { SpaceAbout } from './space.about.entity';
import { ISpaceAbout } from './space.about.interface';

@Injectable()
export class SpaceAboutService {
  constructor(
    private spaceLookupService: SpaceLookupService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private profileService: ProfileService,
    private roleSetService: RoleSetService,
    private inputCreatorService: InputCreatorService,
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
    await this.profileService.addOrUpdateTagsetOnProfile(spaceAbout.profile, {
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
        spaceAboutData.guidelines ?? guidelinesInput,
        storageAggregator
      );

    // add the visuals
    await this.profileService.addVisualsOnProfile(
      spaceAbout.profile,
      spaceAboutData.profileData.visuals,
      [VisualType.AVATAR, VisualType.BANNER, VisualType.CARD]
    );

    // Do not save here — callers assign this to a parent entity with
    // cascade: true, so the parent's save handles persistence.
    // Saving via the default repository would bypass the caller's
    // transaction and cause FK violations on storageAggregator.
    return spaceAbout;
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

    return await this.save(spaceAbout);
  }

  public async save(spaceAbout: ISpaceAbout): Promise<ISpaceAbout> {
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

  async getMetrics(
    spaceAbout: ISpaceAbout,
    preloadedCommunity?: ICommunity | null
  ): Promise<INVP[]> {
    const metrics: INVP[] = [];

    const community =
      preloadedCommunity && preloadedCommunity.roleSet
        ? preloadedCommunity
        : await this.getCommunityWithRoleSet(spaceAbout.id);
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

  public getMergedTemplateSpaceAbout(
    templateSpaceAbout: ISpaceAbout,
    spaceInputAbout: CreateSpaceAboutInput
  ): CreateSpaceAboutInput {
    const guidelines = templateSpaceAbout.guidelines
      ? this.inputCreatorService.buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
          templateSpaceAbout.guidelines
        )
      : undefined;

    const mergedTagsets = this.mergeTagsets(
      spaceInputAbout.profileData.tagsets,
      templateSpaceAbout.profile.tagsets
    );

    const mergedVisuals = this.mergeVisuals(
      spaceInputAbout.profileData.visuals,
      templateSpaceAbout.profile.visuals
    );

    return {
      why: spaceInputAbout.why || templateSpaceAbout.why,
      who: spaceInputAbout.who || templateSpaceAbout.who,
      guidelines,
      profileData: {
        ...spaceInputAbout.profileData,
        description:
          spaceInputAbout.profileData.description ||
          templateSpaceAbout.profile.description,
        tagline:
          spaceInputAbout.profileData.tagline ||
          templateSpaceAbout.profile.tagline,
        referencesData: (templateSpaceAbout.profile.references || []).map(
          reference => ({
            name: reference.name,
            uri: reference.uri,
            description: reference.description,
          })
        ),
        location: {
          city: templateSpaceAbout.profile.location?.city,
          country: templateSpaceAbout.profile.location?.country,
        },
        tagsets: mergedTagsets,
        visuals: mergedVisuals,
      },
    };
  }

  /**
   * Merges two sets of tagsets, ensuring deep copies are created for template tagsets.
   *
   * @param inputTagsets - The tagsets provided in the input.
   * @param templateTagsets - The tagsets from the template.
   * @returns An array of merged tagsets with combined tags, ensuring new entities for template tagsets.
   */
  private mergeTagsets(
    inputTagsets: CreateTagsetInput[] | undefined,
    templateTagsets: ITagset[] | undefined
  ): CreateTagsetInput[] | undefined {
    if (!inputTagsets && !templateTagsets) {
      return undefined;
    }

    const combinedTagsets = [
      ...(inputTagsets || []),
      ...(templateTagsets || []).map(tagset => ({
        name: tagset.name,
        tags: [...tagset.tags],
      })),
    ];

    const tagsetMap = new Map<string, { name: string; tags: Set<string> }>();

    combinedTagsets.forEach(tagset => {
      if (!tagsetMap.has(tagset.name)) {
        tagsetMap.set(tagset.name, {
          ...tagset,
          tags: new Set(tagset.tags || []),
        });
      } else {
        const existingTagset = tagsetMap.get(tagset.name);
        tagset.tags?.forEach(tag => existingTagset?.tags.add(tag));
      }
    });

    return Array.from(tagsetMap.values()).map(tagset => ({
      ...tagset,
      tags: Array.from(tagset.tags),
    }));
  }

  /**
   * Merges visuals from input and template, prioritizing input visuals if available.
   *
   * @param inputVisuals - The visuals provided in the input.
   * @param templateVisuals - The visuals from the template.
   * @returns An array of merged visuals with constraints applied.
   */
  private mergeVisuals(
    inputVisuals: CreateVisualOnProfileInput[] | undefined,
    templateVisuals: IVisual[] | undefined
  ): CreateVisualOnProfileInput[] | undefined {
    if (!inputVisuals && !templateVisuals) {
      return undefined;
    }

    const visualsMap = new Map<VisualType, string>();

    [VisualType.AVATAR, VisualType.CARD, VisualType.BANNER].forEach(type => {
      const inputUri = inputVisuals?.find(v => v.name === type)?.uri;
      const templateUri = templateVisuals?.find(v => v.name === type)?.uri;
      visualsMap.set(type, inputUri || templateUri || '');
    });

    return Array.from(visualsMap.entries()).map(([name, uri]) => ({
      name,
      uri,
      ...DEFAULT_VISUAL_CONSTRAINTS[name],
    }));
  }
}
