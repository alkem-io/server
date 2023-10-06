import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICalloutFraming } from './callout.framing.interface';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { CalloutFraming } from './callout.framing.entity';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => ICalloutFraming)
export class CalloutFramingResolverFields {
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for framing the associated Callout.',
  })
  @Profiling.api
  async profile(
    @Parent() calloutFraming: ICalloutFraming,
    @Loader(ProfileLoaderCreator, { parentClassRef: CalloutFraming })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(calloutFraming.id);
  }
}
