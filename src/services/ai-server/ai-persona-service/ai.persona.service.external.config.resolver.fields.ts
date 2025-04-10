import { UseGuards } from '@nestjs/common';
import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { GraphqlGuard } from '@core/authorization';
import { Profiling } from '@common/decorators';
import { IExternalConfig } from './dto';

@Resolver(() => IExternalConfig)
export class AiPersonaServiceExternalConfigResolverFields {
  constructor(private aiPersonaServiceService: AiPersonaServiceService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('apiKey', () => String, {
    nullable: true,
    description: 'The signature of the API key',
  })
  @Profiling.api
  async apiKey(@Parent() parent: IExternalConfig) {
    return this.aiPersonaServiceService.getApiKeyID(parent);
  }
}
