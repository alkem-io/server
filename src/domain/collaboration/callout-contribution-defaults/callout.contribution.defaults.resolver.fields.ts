import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalloutContributionDefaults } from './callout.contribution.defaults.interface';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';

@Resolver(() => ICalloutContributionDefaults)
export class CalloutContributionDefaultsResolverFields {
  constructor(
    private readonly defaultsService: CalloutContributionDefaultsService
  ) {}

  @ResolveField('whiteboardContentAvailable', () => Boolean, {
    nullable: false,
    description:
      'Whether this Callout has a non-empty default for Whiteboard contributions.',
  })
  async whiteboardContentAvailable(
    @Parent() defaults: ICalloutContributionDefaults
  ): Promise<boolean> {
    return this.defaultsService.hasVisibleWhiteboardContent(defaults);
  }
}
