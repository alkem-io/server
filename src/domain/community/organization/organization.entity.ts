import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { Profile } from '@domain/community/profile/profile.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IOrganization } from './organization.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';

@Entity()
export class Organization
  extends NameableEntity
  implements IOrganization, IGroupable
{
  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  profile?: Profile;

  @OneToMany(() => UserGroup, userGroup => userGroup.organization, {
    eager: false,
    cascade: true,
  })
  groups?: UserGroup[];

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  @Column()
  legalEntityName?: string = '';

  @Column()
  domain?: string = '';

  @Column()
  website?: string = '';

  @Column()
  contactEmail?: string = '';

  @Column({ default: OrganizationVerificationEnum.NOT_VERIFIED })
  verificationType!: string;

  constructor() {
    super();
  }
}
