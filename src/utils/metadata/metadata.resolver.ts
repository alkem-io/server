import { Query, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { AadConfig } from './client-metadata/aad-config/aad.config.entity';
import { IAadConfig } from './client-metadata/aad-config/aad.config.interface';
import { Metadata } from './metadata.entity';
import { IMetadata } from './metadata.interface';
import { MetadataService } from './metadata.service';

@Resolver()
export class MetadataResolver {
  constructor(
    private configService: ConfigService,
    private metadataService: MetadataService
  ) {}
  @Query(() => AadConfig, {
    nullable: false,
    description: 'CT Web Client Configuration',
  })
  async clientConfig(): Promise<IAadConfig> {
    return (await this.configService.get<IAadConfig>(
      'aad_client'
    )) as IAadConfig;
  }

  @Query(() => Metadata, {
    nullable: false,
    description: 'CT Web Client Configuration',
  })
  async metadata(): Promise<IMetadata> {
    return await this.metadataService.getMetadata();
  }
}
