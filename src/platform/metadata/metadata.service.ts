import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMetadata } from './metadata.interface';
import { IServiceMetadata } from './service/service.metadata.interface';

@Injectable()
export class MetadataService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getMetadata(): Promise<IMetadata> {
    return {
      services: await this.getServicesMetadata(),
    };
  }

  async getServicesMetadata(): Promise<IServiceMetadata[]> {
    const alkemioServerMetadata = await this.getAlkemioServerMetadata();
    const servicesMetadata = [alkemioServerMetadata];
    return servicesMetadata;
  }

  async getAlkemioServerMetadata(): Promise<IServiceMetadata> {
    return {
      name: 'alkemio-server',
      version: await this.getVersion(),
    };
  }

  async getVersion(): Promise<string> {
    return process.env.npm_package_version ?? '';
  }
}
