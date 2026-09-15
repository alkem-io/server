import { AuthorizationActorHasPrivilege } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { EntityNotFoundException } from '@common/exceptions';
import { GraphqlGuard } from '@core/authorization';
import { ProfileLoaderCreator } from '@core/dataloader/creators/loader.creators/profile.loader.creator';
import { SpaceBySpaceAboutIdLoaderCreator } from '@core/dataloader/creators/loader.creators/space/space.by.space.about.id.loader.creator';
import { SpaceMetricsLoaderCreator } from '@core/dataloader/creators/loader.creators/space/space.metrics.loader.creator';
import { SpaceProviderLoaderCreator } from '@core/dataloader/creators/loader.creators/space/space.provider.loader.creator';
import { SpaceAboutClassificationsLoaderCreator } from '@core/dataloader/creators/loader.creators/space.about.classifications.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { IClassificationEntry } from '@domain/space/classification.entry/classification.entry.interface';
import { ClassificationEntryService } from '@domain/space/classification.entry/classification.entry.service';
import { TemplateContentSpaceLookupService } from '@domain/template/template-content-space/template-content-space.lookup/template-content-space.lookup.service';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ISpace } from '../space/space.interface';
import { SpaceAboutMembership } from '../space.about.membership/dto/space.about.membership';
import { SpaceAbout } from './space.about.entity';
import { ISpaceAbout } from './space.about.interface';
import { SpaceAboutService } from './space.about.service';

@Resolver(() => ISpaceAbout)
export class SpaceAboutResolverFields {
  constructor(
    private readonly spaceAboutService: SpaceAboutService,
    private templateContentSpaceLookupService: TemplateContentSpaceLookupService,
    private classificationEntryService: ClassificationEntryService
  ) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Space.',
  })
  async profile(
    @Parent() space: ISpace,
    @Loader(ProfileLoaderCreator, { parentClassRef: SpaceAbout })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(space.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about activity within this Space.',
  })
  async metrics(
    @Parent() spaceAbout: ISpaceAbout,
    @Loader(SpaceMetricsLoaderCreator)
    loader: ILoader<INVP[]>
  ) {
    return loader.load(spaceAbout.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('provider', () => IActor, {
    nullable: true,
    description: 'The Space provider (host).',
  })
  async provider(
    @Parent() spaceAbout: ISpaceAbout,
    @Loader(SpaceProviderLoaderCreator)
    loader: ILoader<IActor | null>
  ): Promise<IActor | null> {
    return loader.load(spaceAbout.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('isContentPublic', () => Boolean, {
    nullable: false,
    description: 'Is the content of this Space visible to non-Members?.',
  })
  async isContentPublic(
    @Parent() spaceAbout: ISpaceAbout,
    @Loader(SpaceBySpaceAboutIdLoaderCreator)
    loader: ILoader<ISpace | null>
  ): Promise<boolean> {
    const spaceAboutId = spaceAbout.id;
    const space = await loader.load(spaceAboutId);
    if (space) {
      return space.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
    }
    // Fallback for TemplateContentSpace (not a regular Space)
    const spaceTemplate =
      await this.templateContentSpaceLookupService.getTemplateContentSpaceForSpaceAbout(
        spaceAboutId
      );
    if (spaceTemplate) {
      return spaceTemplate.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
    }
    throw new EntityNotFoundException(
      'Unable to find Space or TemplateContentSpace for the about',
      LogContext.SPACES,
      { spaceAboutId }
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('membership', () => SpaceAboutMembership, {
    nullable: false,
    description: 'The membership information for this Space.',
  })
  async membership(
    @Parent() spaceAbout: ISpaceAbout,
    @Loader(SpaceBySpaceAboutIdLoaderCreator)
    loader: ILoader<ISpace | null>
  ): Promise<SpaceAboutMembership> {
    const space = await loader.load(spaceAbout.id);
    const community = space?.community;
    if (!community || !community.roleSet) {
      // Fallback to the original method if the DataLoader didn't find a space
      const fallbackCommunity =
        await this.spaceAboutService.getCommunityWithRoleSet(spaceAbout.id);
      return {
        community: fallbackCommunity,
        roleSet: fallbackCommunity.roleSet,
      };
    }
    return {
      community,
      roleSet: community.roleSet,
    };
  }

  @ResolveField('guidelines', () => ICommunityGuidelines, {
    nullable: false,
    description: 'The guidelines for members of this Community.',
  })
  async guidelines(
    @Parent() spaceAbout: ISpaceAbout
  ): Promise<ICommunityGuidelines> {
    return await this.spaceAboutService.getCommunityGuidelines(spaceAbout);
  }

  // No @AuthorizationActorHasPrivilege decorator here, deliberately: read
  // authorization for classifications is inherited from the About query
  // path, and adding one would break S-13/FR-010d (any principal who may
  // read the About receives every entry, including a hidden one,
  // anonymously on a public Space). Writes are gated separately, on the
  // owning About's UPDATE privilege, in ClassificationEntryResolverMutations.
  @ResolveField('classifications', () => [IClassificationEntry], {
    nullable: false,
    description:
      'The classification entries on this About, in sortOrder. Empty array when none exist — never null, never an error.',
  })
  async classifications(
    @Parent() spaceAbout: ISpaceAbout,
    @Loader(SpaceAboutClassificationsLoaderCreator)
    loader: ILoader<IClassificationEntry[]>
  ): Promise<IClassificationEntry[]> {
    return loader.load(spaceAbout.id);
  }
}
