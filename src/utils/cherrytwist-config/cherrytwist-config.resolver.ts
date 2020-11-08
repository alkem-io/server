import { Query, Resolver } from '@nestjs/graphql';
import { AadClientConfig } from './aad-client-config/aad.client.config.entity';
import { IAadClientConfig } from './aad-client-config/aad.client.config.interface';
import { ConfigService } from '@nestjs/config';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class CherrytwistConfigResolver {
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}
  @Query(() => AadClientConfig, {
    nullable: false,
    description: 'CT Web Client Configuration',
  })
  async clientConfig(): Promise<IAadClientConfig> {
    this.logger.verbose('TEST');
    return (await this.configService.get<IAadClientConfig>(
      'aad_client'
    )) as IAadClientConfig;
  }
}
