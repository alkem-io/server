import { IServiceMetadata } from '@platform/metadata';

export class ServiceMetadata extends IServiceMetadata {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
