import { Profiling } from '@common/decorators';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Link } from './link.entity';
import { ILink } from './link.interface';

@Resolver(() => ILink)
export class LinkResolverFields {
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
