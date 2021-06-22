import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { Credential } from '@domain/agent/credential/credential.entity';
import { User } from '@domain/community/user/user.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class Agent extends AuthorizableEntity implements IAgent {
  @Column('text', { nullable: true })
  parentDisplayID?: string = '';

  //todo: replace with output DID that resolves to a string
  @Column('varchar', { length: 255, nullable: true })
  did!: string;

  @Column('varchar', { length: 255, nullable: true })
  password!: string;

  @OneToMany(
    () => Credential,
    credential => credential.agent,
    {
      eager: true,
      cascade: true,
    }
  )
  credentials?: Credential[];

  @OneToOne(
    () => User,
    user => user.agent,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  user?: User;

  constructor() {
    super();
    this.did = '';
    this.password = '';
  }
}
