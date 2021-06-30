import { KonfigService } from './config.service';
import { Query, Resolver } from '@nestjs/graphql';
import { IConfig } from './config.interface';
@Resolver()
export class ConfigResolver {
  constructor(private configService: KonfigService) {}

  @Query(() => IConfig, {
    nullable: false,
    description:
      'Alkemio configuration. Provides configuration to external services in the Alkemio ecosystem.',
  })
  async configuration(): Promise<IConfig> {
    const config = await this.configService.getConfig();
    return config;
  }
}
