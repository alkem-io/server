import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ILink } from '@domain/collaboration/link/link.interface';
import { IMemo } from '@domain/common/memo/types';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFramingService } from './callout.framing.service';

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

  @ResolveField('link', () => ILink, {
    nullable: true,
    description: 'The Link for framing the associated Callout.',
  })
  link(@Parent() calloutFraming: ICalloutFraming): Promise<ILink | null> {
    return this.calloutFramingService.getLink(calloutFraming);
  }

  @ResolveField('memo', () => IMemo, {
    nullable: true,
    description: 'The Memo for framing the associated Callout.',
  })
  memo(@Parent() calloutFraming: ICalloutFraming): Promise<IMemo | null> {
    return this.calloutFramingService.getMemo(calloutFraming);
  }
}
