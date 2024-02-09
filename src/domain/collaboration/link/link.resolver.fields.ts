import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ILink } from './link.interface';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { Link } from './link.entity';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => ILink)
export class LinkResolverFields {
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for framing the associated Link Contribution.',
  })
  @Profiling.api
  async profile(
    @Parent() link: ILink,
    @Loader(ProfileLoaderCreator, { parentClassRef: Link })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(link.id);
  }
}
