import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFramingService } from './callout.framing.service';

@Resolver(() => ICalloutFraming)
export class CalloutFramingResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private calloutFramingService: CalloutFramingService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for framing the associated Callout.',
  })
  async profile(@Parent() calloutFraming: ICalloutFraming): Promise<IProfile> {
    return this.calloutFramingService.getProfile(calloutFraming);
  }
}
