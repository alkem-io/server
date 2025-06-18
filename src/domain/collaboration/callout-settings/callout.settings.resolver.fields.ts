import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICalloutSettings } from './callout.settings.interface';
import { Profiling } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { CalloutSettings } from './callout.settings.entity';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { CalloutSettingsService } from './callout.settings.service';
import { IWhiteboard } from '@domain/common/whiteboard/types';

@Resolver(() => ICalloutSettings)
export class CalloutSettingsResolverFields {
  constructor(private calloutSettingsService: CalloutSettingsService) {}

  /*  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for settings the associated Callout.',
  })
  @Profiling.api
  async profile(
    @Parent() calloutSettings: ICalloutSettings,
    @Loader(ProfileLoaderCreator, { parentClassRef: CalloutSettings })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(calloutSettings.id);
  }

  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for settings the associated Callout.',
  })
  @Profiling.api
  whiteboard(
    @Parent() calloutSettings: ICalloutSettings
  ): Promise<IWhiteboard | null> {
    return this.calloutSettingsService.getWhiteboard(calloutSettings);
  }
    */
}
