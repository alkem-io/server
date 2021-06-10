import { INVP } from '@domain/common/nvp';
import { IServiceMetadata } from './service/service.metadata.interface';

export interface IMetadata {
  services?: IServiceMetadata[];
  activity?: INVP[];
}
