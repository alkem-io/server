import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { IAgent } from '@domain/agent/agent';
import { ICredential, Credential } from '@domain/agent/credential';
import { DID } from '@domain/common/scalars';
import { User } from '@domain/community/user';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Agent extends BaseCherrytwistEntity implements IAgent {
  @Column('text', { nullable: true })
  parentDisplayID?: string = '';

  @Column('varchar', { length: 255, nullable: true })
  did!: DID;

  @OneToMany(
    () => Credential,
    credential => credential.agent,
    {
      eager: true,
      cascade: true,
    }
  )
  credentials?: ICredential[];

  @OneToOne(
    () => User,
    user => user.agent,
    { eager: false, cascade: false }
  )
  user?: User;

  constructor() {
    super();
  }
}
