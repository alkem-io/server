import { IClientMetadata } from './client-metadata/client.metadata.interface';
import { IServerMetadata } from './server-metadata/server.metadata.interface';

export interface IMetadata {
  clientMetadata?: IClientMetadata;
  serverMetadata?: IServerMetadata;
}
