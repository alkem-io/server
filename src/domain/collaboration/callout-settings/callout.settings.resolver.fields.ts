import { AuthorizationAgentPrivilege } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.interface';
import { ICalloutSettingsFraming } from '../callout-settings-framing/callout.settings.framing.interface';
import { CalloutSettings } from './callout.settings.entity';
import { ICalloutSettings } from './callout.settings.interface';
import { CalloutSettingsService } from './callout.settings.service';

@Resolver(() => ICalloutSettings)
export class CalloutSettingsResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calloutSettingsService: CalloutSettingsService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('framing', () => ICalloutSettingsFraming, {
    nullable: false,
    description: 'The Framing Settings for this Callout.',
  })
  async framing(
    @Parent() calloutSettings: CalloutSettings
  ): Promise<ICalloutSettingsFraming> {
    return await this.calloutSettingsService.getFramingSettings(
      calloutSettings.id
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contribution', () => ICalloutSettingsContribution, {
    nullable: false,
    description: 'The Contribution Settings for this Callout.',
  })
  async contribution(
    @Parent() calloutSettings: CalloutSettings
  ): Promise<ICalloutSettingsContribution> {
    return await this.calloutSettingsService.getContributionSettings(
      calloutSettings.id
    );
  }

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
