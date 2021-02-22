import { KonfigService } from './config.service';
import { Query, Resolver } from '@nestjs/graphql';
import { IConfig } from './config.interface';
import { Config } from './config.entity';

@Resolver()
export class ConfigResolver {
  constructor(private configService: KonfigService) {}

  @Query(() => Config, {
    nullable: false,
    description:
      'Cherrytwist configuration. Provides configuration to external services in the Cherrytwist ecosystem.',
  })
  async configuration(): Promise<IConfig> {
    const config = await this.configService.getConfig();
    return config;
  }
}
