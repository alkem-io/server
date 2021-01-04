import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAadConfig } from './client/aad-config/aad.config.interface';
import { IWebClientConfig } from './client/web.client.config.interface';
import { ITemplate } from './template/template.interface';
import * as uxTemplate from '../../templates/ux-template.json';
import { IConfig } from './config.interface';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService) {}

  async getConfig(): Promise<IConfig> {
    return {
      template: await this.getTemplate(),
      webClient: await this.getWebClientConfig(),
    };
  }

  async getWebClientConfig(): Promise<IWebClientConfig> {
    return {
      aadConfig: await this.getAadConfig(),
    };
  }

  async getTemplate(): Promise<ITemplate> {
    const template = {
      ...uxTemplate,
    };

    return template;
  }

  async getAadConfig(): Promise<IAadConfig> {
    return (await this.configService.get<IAadConfig>(
      'aad_client'
    )) as IAadConfig;
  }
}
