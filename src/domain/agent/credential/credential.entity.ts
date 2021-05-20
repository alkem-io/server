import { Column, Entity, ManyToOne } from 'typeorm';
import { ICredential } from '@domain/agent/credential';
import { Agent, IAgent } from '@domain/agent/agent';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Credential extends BaseCherrytwistEntity implements ICredential {
  @Column()
  resourceID: number;

  @Column()
  type: string;

  @ManyToOne(
    () => Agent,
    agent => agent.credentials,
    { eager: false, cascade: false, onDelete: 'SET NULL' }
  )
  agent?: IAgent;

  constructor(type: string, resourceID: number) {
    super();
    this.type = type;
    this.resourceID = resourceID;
    if (!this.resourceID) this.resourceID = -1;
  }
}
