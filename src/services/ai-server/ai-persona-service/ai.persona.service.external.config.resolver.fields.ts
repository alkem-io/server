import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { Profiling } from '@common/decorators';
import { IExternalConfig } from './dto';

@Resolver(() => IExternalConfig)
export class AiPersonaServiceExternalConfigResolverFields {
  constructor(private aiPersonaServiceService: AiPersonaServiceService) {}

  @ResolveField('apiKey', () => String, {
    nullable: true,
    description: 'The signature of the API key',
  })
  @Profiling.api
  async apiKey(@Parent() parent: IExternalConfig) {
    return this.aiPersonaServiceService.getApiKeyID(parent);
  }
}
