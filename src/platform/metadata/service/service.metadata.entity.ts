import { IServiceMetadata } from './service.metadata.interface';

export class ServiceMetadata extends IServiceMetadata {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
