import { IServiceMetadata } from './service.metadata.interface';

export class ServiceMetadata extends IServiceMetadata {
  name: string;
  version?: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
