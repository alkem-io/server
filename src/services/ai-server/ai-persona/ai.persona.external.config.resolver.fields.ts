import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { Profiling } from '@common/decorators';
import { IExternalConfig } from './dto';
import { AiPersonaService } from './ai.persona.service';

@Resolver(() => IExternalConfig)
export class AiPersonaExternalConfigResolverFields {
  constructor(private aiPersonaService: AiPersonaService) {}

  @ResolveField('apiKey', () => String, {
    nullable: true,
    description: 'The signature of the API key',
  })
  @Profiling.api
  async apiKey(@Parent() parent: IExternalConfig) {
    return this.aiPersonaService.getApiKeyID(parent);
  }
}
