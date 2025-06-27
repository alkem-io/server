import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICalloutFraming } from './callout.framing.interface';
import { Loader } from '@core/dataloader/decorators';
import { CalloutFraming } from './callout.framing.entity';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { CalloutFramingService } from './callout.framing.service';
import { IWhiteboard } from '@domain/common/whiteboard/types';

@Resolver(() => ICalloutFraming)
export class CalloutFramingResolverFields {
  constructor(private calloutFramingService: CalloutFramingService) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for framing the associated Callout.',
  })
  async profile(
    @Parent() calloutFraming: ICalloutFraming,
    @Loader(ProfileLoaderCreator, { parentClassRef: CalloutFraming })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(calloutFraming.id);
  }

  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for framing the associated Callout.',
  })
  whiteboard(
    @Parent() calloutFraming: ICalloutFraming
  ): Promise<IWhiteboard | null> {
    return this.calloutFramingService.getWhiteboard(calloutFraming);
  }
}
