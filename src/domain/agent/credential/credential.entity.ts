import { Agent } from '@domain/agent/agent/agent.entity';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';

export class Credential extends BaseAlkemioEntity implements ICredential {
  resourceID!: string;

  type!: string;

  agent?: Agent;

  issuer!: string;

  expires?: Date;

  constructor() {
    super();
  }
}
