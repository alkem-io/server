import { IProfile } from '@domain/common/profile/profile.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ISpace } from '../space/space.interface';
import { ProfileLoaderCreator } from '@core/dataloader/creators/loader.creators/profile.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpaceAbout } from './space.about.interface';
import { SpaceAbout } from './space.about.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { SpaceAboutService } from './space.about.service';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { SpaceAboutMembership } from '../space.about.membership/dto/space.about.membership';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { AuthorizationAgentPrivilege } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => ISpaceAbout)
export class SpaceAboutResolverFields {
  constructor(
    private readonly spaceAboutService: SpaceAboutService,
    private spaceLookupService: SpaceLookupService
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about activity within this Space.',
  })
  async metrics(@Parent() spaceAbout: ISpaceAbout) {
    return await this.spaceAboutService.getMetrics(spaceAbout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('provider', () => IContributor, {
    nullable: false,
    description: 'The Space provider (host).',
  })
  async provider(@Parent() spaceAbout: ISpaceAbout): Promise<IContributor> {
    return await this.spaceLookupService.getProvider(spaceAbout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('isContentPublic', () => Boolean, {
    nullable: false,
    description: 'Is the content of this Space visible to non-Members?.',
  })
  async isContentPublic(@Parent() spaceAbout: ISpaceAbout): Promise<boolean> {
    const space = await this.spaceLookupService.getSpaceForSpaceAboutOrFail(
      spaceAbout.id
    );
    return space.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('membership', () => SpaceAboutMembership, {
    nullable: false,
    description: 'The membership information for this Space.',
  })
  async membership(
    @Parent() spaceAbout: ISpaceAbout
  ): Promise<SpaceAboutMembership> {
    const community = await this.spaceAboutService.getCommunityWithRoleSet(
      spaceAbout.id
    );
    const membership: SpaceAboutMembership = {
      community,
      roleSet: community.roleSet,
    };
    return membership;
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
}
