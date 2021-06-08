import { Injectable } from '@nestjs/common';
import { IMetadata } from './metadata.interface';
import { IServiceMetadata } from './service/service.metadata.interface';

@Injectable()
export class MetadataService {
  async getMetadata(): Promise<IMetadata> {
    return {
      services: await this.getServicesMetadata(),
    };
  }

  async getServicesMetadata(): Promise<IServiceMetadata[]> {
    const ctServerMetadata = await this.getCtServerMetadata();
    const servicesMetadata = [ctServerMetadata];
    return servicesMetadata;
  }

  async getCtServerMetadata(): Promise<IServiceMetadata> {
    return {
      name: 'ct-server',
      version: await this.getVersion(),
    };
  }

  async getVersion(): Promise<string> {
    return process.env.npm_package_version ?? '';
  }
}
