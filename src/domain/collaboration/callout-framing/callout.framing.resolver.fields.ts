import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICalloutFraming } from './callout.framing.interface';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { CalloutFraming } from './callout.framing.entity';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IWhiteboard } from '@domain/common/whiteboard';
import { CalloutFramingService } from './callout.framing.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { CalloutFramingWhiteboardLoaderCreator } from '@core/dataloader/creators/loader.creators/callout-framing/callout.framing.whiteboard.loader';

@Resolver(() => ICalloutFraming)
export class CalloutFramingResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private calloutFramingService: CalloutFramingService
  ) {}

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

  @UseGuards(GraphqlGuard)
  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for framing the associated Callout.',
  })
  @Profiling.api
  async whiteboard(
    @Parent() calloutFraming: ICalloutFraming,
    @Loader(CalloutFramingWhiteboardLoaderCreator, { resolveToNull: true })
    loader: ILoader<IWhiteboard>
  ): Promise<IWhiteboard> {
    return loader.load(calloutFraming.id);
  }
}
