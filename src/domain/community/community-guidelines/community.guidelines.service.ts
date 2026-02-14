import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CommunityGuidelines } from './community.guidelines.entity';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { communityGuidelines } from './community.guidelines.schema';
import { CreateCommunityGuidelinesInput } from './dto/community.guidelines.dto.create';
import { UpdateCommunityGuidelinesInput } from './dto/community.guidelines.dto.update';

@Injectable()
export class CommunityGuidelinesService {
  constructor(
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  async createCommunityGuidelines(
    communityGuidelinesData: CreateCommunityGuidelinesInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines: ICommunityGuidelines = new CommunityGuidelines();
    communityGuidelines.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNITY_GUIDELINES
    );

    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: [],
    };
    communityGuidelinesData.profile.tagsets =
      this.tagsetService.updateTagsetInputs(
        communityGuidelinesData.profile.tagsets,
        [defaultTagset]
      );

    communityGuidelines.profile = await this.profileService.createProfile(
      communityGuidelinesData.profile,
      ProfileType.COMMUNITY_GUIDELINES,
      storageAggregator
    );

    await this.profileService.addVisualsOnProfile(
      communityGuidelines.profile,
      communityGuidelinesData.profile.visuals,
      [VisualType.CARD]
    );

    return communityGuidelines;
  }

  async save(
    guidelinesInput: ICommunityGuidelines
  ): Promise<ICommunityGuidelines> {
    if (guidelinesInput.id) {
      const [updated] = await this.db
        .update(communityGuidelines)
        .set({
          profileId: guidelinesInput.profile?.id ?? null,
          authorizationId: guidelinesInput.authorization?.id ?? null,
        })
        .where(eq(communityGuidelines.id, guidelinesInput.id))
        .returning();
      return { ...guidelinesInput, ...updated } as unknown as ICommunityGuidelines;
    }
    const [inserted] = await this.db
      .insert(communityGuidelines)
      .values({
        profileId: guidelinesInput.profile?.id ?? null,
        authorizationId: guidelinesInput.authorization?.id ?? null,
      })
      .returning();
    return { ...guidelinesInput, ...inserted } as unknown as ICommunityGuidelines;
  }

  async update(
    guidelinesInput: ICommunityGuidelines,
    communityGuidelinesData: UpdateCommunityGuidelinesInput
  ): Promise<ICommunityGuidelines> {
    guidelinesInput.profile = await this.profileService.updateProfile(
      guidelinesInput.profile,
      communityGuidelinesData.profile
    );

    return await this.save(guidelinesInput);
  }

  async eraseContent(
    guidelinesInput: ICommunityGuidelines
  ): Promise<ICommunityGuidelines> {
    guidelinesInput.profile = await this.profileService.updateProfile(
      guidelinesInput.profile,
      {
        displayName: '',
        description: '',
      }
    );

    await this.profileService.deleteAllReferencesFromProfile(
      guidelinesInput.profile.id
    );
    guidelinesInput.profile.references = [];

    return await this.save(guidelinesInput);
  }

  async deleteCommunityGuidelines(
    communityGuidelinesID: string
  ): Promise<ICommunityGuidelines> {
    const guidelinesEntity = await this.getCommunityGuidelinesOrFail(
      communityGuidelinesID,
      {
        with: { profile: true },
      }
    );

    await this.profileService.deleteProfile(guidelinesEntity.profile.id);

    await this.db
      .delete(communityGuidelines)
      .where(eq(communityGuidelines.id, communityGuidelinesID));
    return guidelinesEntity;
  }

  async getCommunityGuidelinesOrFail(
    communityGuidelinesID: string,
    options?: { with?: Record<string, boolean | object> }
  ): Promise<ICommunityGuidelines | never> {
    const result =
      await this.db.query.communityGuidelines.findFirst({
        where: eq(communityGuidelines.id, communityGuidelinesID),
        with: options?.with,
      });

    if (!result)
      throw new EntityNotFoundException(
        `Unable to find CommunityGuidelines with ID: ${communityGuidelinesID}`,
        LogContext.SPACES
      );
    return result as unknown as ICommunityGuidelines;
  }

  public async getProfile(
    communityGuidelinesInput: ICommunityGuidelines
  ): Promise<IProfile> {
    const guidelinesEntity = await this.getCommunityGuidelinesOrFail(
      communityGuidelinesInput.id,
      {
        with: { profile: true },
      }
    );
    if (!guidelinesEntity.profile)
      throw new EntityNotFoundException(
        `CommunityGuidelines profile not initialised: ${guidelinesEntity.id}`,
        LogContext.COLLABORATION
      );

    return guidelinesEntity.profile;
  }
}
