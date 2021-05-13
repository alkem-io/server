import { ICredential } from '@domain/agent/credential';
import { DID } from '@domain/common/scalars';

export interface IAgent {
  id: number;
  did: DID;
  credentials?: ICredential[];
  // primarily used to give meaningful error messages if something goes wrong with the agent
  parentDisplayID?: string;
}
