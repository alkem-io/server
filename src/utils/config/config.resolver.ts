import { KonfigService } from './config.service';
import { Query, Resolver } from '@nestjs/graphql';
import { AadConfig } from './client/aad-config/aad.config.entity';
import { IAadConfig } from './client/aad-config/aad.config.interface';
import { IConfig } from './config.interface';
import { Config } from './config.entity';
@Resolver()
export class ConfigResolver {
  constructor(private configService: KonfigService) {}
  @Query(() => AadConfig, {
    nullable: false,
    description: 'Cherrytwist Web Client AAD Configuration',
  })
  async clientConfig(): Promise<IAadConfig> {
    return await this.configService.getAadConfig();
  }

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
