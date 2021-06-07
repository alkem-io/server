import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { IAgent } from '@domain/agent/agent';
import { ICredential, Credential } from '@domain/agent/credential';
import { User } from '@domain/community/user';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Agent extends BaseCherrytwistEntity implements IAgent {
  @Column('text', { nullable: true })
  parentDisplayID?: string = '';

  //todo: replace with output DID that resolves to a string
  @Column('varchar', { length: 255, nullable: true })
  did?: string;

  @Column()
  password?: string;

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
    this.did = '';
    this.password = '';
  }
}
