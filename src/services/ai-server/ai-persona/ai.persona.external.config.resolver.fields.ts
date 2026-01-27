import { Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AiPersonaService } from './ai.persona.service';
import { IExternalConfig } from './dto';

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
