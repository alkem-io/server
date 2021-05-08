import { ICredential } from '@domain/agent/credential';

export interface IAgent {
  id: number;
  credentials?: ICredential[];
  did?: string;
  password?: string;
}
