import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IProfile } from '@domain/common/profile/profile.interface';
import { UseGuards } from '@nestjs/common';
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
import { SpaceAboutMembershipService } from '../space.about.membership/space.about.membership.service';
import { SpaceAboutMembership } from '../space.about.membership/dto/space.about.membership';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';

@Resolver(() => ISpaceAbout)
export class SpaceAboutResolverFields {
  constructor(
    private readonly spaceAboutService: SpaceAboutService,
    private readonly spaceAboutMembershipService: SpaceAboutMembershipService,
    private spaceLookupService: SpaceLookupService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Space.',
  })
  async profile(
    @Parent() space: ISpace,
    @Loader(ProfileLoaderCreator, { parentClassRef: SpaceAbout })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    const profile = await loader.load(space.id);
    return profile;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about activity within this Space.',
  })
  async metrics(@Parent() spaceAbout: ISpaceAbout) {
    return await this.spaceAboutService.getMetrics(spaceAbout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('provider', () => IContributor, {
    nullable: false,
    description: 'The Space provider (host).',
  })
  async provider(@Parent() spaceAbout: ISpaceAbout): Promise<IContributor> {
    return await this.spaceLookupService.getProvider(spaceAbout);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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
  @ResolveField('membership', () => SpaceAboutMembership, {
    nullable: false,
    description: 'The membership information for this Space.',
  })
  async membership(
    @Parent() spaceAbout: ISpaceAbout
  ): Promise<SpaceAboutMembership> {
    const roleSet = await this.spaceAboutService.getCommunityRoleSet(
      spaceAbout.id
    );
    const membership: SpaceAboutMembership = {
      roleSet,
    };
    return membership;
  }
}
