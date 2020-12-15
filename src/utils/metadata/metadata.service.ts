import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAadConfig } from './client-metadata/aad-config/aad.config.interface';
import { IClientMetadata } from './client-metadata/client.metadata.interface';
import { IUxTemplate } from './client-metadata/template/template.interface';
import { IMetadata } from './metadata.interface';
import { IServerMetadata } from './server-metadata/server.metadata.interface';
import * as uxTemplate from '../../templates/ux-template.json';

@Injectable()
export class MetadataService {
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getVersion(): Promise<string> {
    return process.env.npm_package_version ?? '';
  }

  async getMetadata(): Promise<IMetadata> {
    return {
      clientMetadata: await this.getClientMetadata(),
      serverMetadata: await this.getServerMetadata(),
    };
  }

  async getClientMetadata(): Promise<IClientMetadata> {
    return {
      template: await this.getTemplate(),
      aadConfig: (await this.configService.get<IAadConfig>(
        'aad_client'
      )) as IAadConfig,
    };
  }

  async getServerMetadata(): Promise<IServerMetadata> {
    return {
      version: await this.getVersion(),
    };
  }

  async getTemplate(): Promise<IUxTemplate> {
    const template = {
      ...uxTemplate,
    };

    return template as IUxTemplate;
  }
}
