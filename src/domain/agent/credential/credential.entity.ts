import { Column, Entity, ManyToOne } from 'typeorm';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Credential extends BaseCherrytwistEntity implements ICredential {
  @Column()
  resourceID: string;

  @Column()
  type: string;

  @ManyToOne(
    () => Agent,
    agent => agent.credentials,
    { eager: false, cascade: false, onDelete: 'SET NULL' }
  )
  agent?: Agent;

  constructor(type: string, resourceID: string) {
    super();
    this.type = type;
    this.resourceID = resourceID;
    if (!this.resourceID) this.resourceID = '';
  }
}
