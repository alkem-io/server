import { ICredential } from '@domain/agent/credential';
import { DID } from '@domain/common/scalars';

export interface IAgent {
  id: number;
  did: DID;
  credentials?: ICredential[];
}
