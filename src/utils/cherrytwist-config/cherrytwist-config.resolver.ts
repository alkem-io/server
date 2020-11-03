import { Query, Resolver } from '@nestjs/graphql';
import { AadClientConfig } from './aad-client-config/aad.client.config.entity';
import { IAadClientConfig } from './aad-client-config/aad.client.config.interface';
import { ConfigService } from '@nestjs/config';

@Resolver()
export class CherrytwistConfigResolver {
  constructor(private configService: ConfigService) {}
  @Query(() => AadClientConfig, {
    nullable: false,
    description: 'CT Web Client Configuration',
  })
  async clientConfig(): Promise<IAadClientConfig> {
    return (await this.configService.get<IAadClientConfig>(
      'aad_client'
    )) as IAadClientConfig;
  }
}
