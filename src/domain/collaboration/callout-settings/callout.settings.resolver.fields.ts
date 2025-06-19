import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICalloutSettings } from './callout.settings.interface';
import { Loader } from '@core/dataloader/decorators';
import { CalloutSettings } from './callout.settings.entity';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { CalloutSettingsService } from './callout.settings.service';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { ICalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.interface';

@Resolver(() => ICalloutSettings)
export class CalloutSettingsResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calloutSettingsService: CalloutSettingsService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributionPolicy', () => ICalloutSettingsContribution, {
    nullable: false,
    description: 'The ContributionPolicy for this Callout.',
  })
  async contributionPolicy(
    @Parent() calloutSettings: CalloutSettings
  ): Promise<ICalloutSettingsContribution> {
    return await this.calloutSettingsService.getContributionPolicy(
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
