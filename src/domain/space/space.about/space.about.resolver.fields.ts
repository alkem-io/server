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

@Resolver(() => ISpaceAbout)
export class SpaceAboutResolverFields {
  constructor() {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ_ABOUT)
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
}
