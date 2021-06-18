import { INVP } from '@domain/common';
import { IMetadata } from './metadata.interface';
import { IServiceMetadata } from './service/service.metadata.interface';
export class Metadata extends IMetadata {
  services?: IServiceMetadata[];

  activity?: INVP[];
}
