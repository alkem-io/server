import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoleName } from '@common/enums/role.name';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { RoleSet } from '../role-set/role.set.entity';
import { IActorRolePolicy } from './actor.role.policy.interface';
import { IRole } from './role.interface';

@Entity()
export class Role extends BaseAlkemioEntity implements IRole {
  @ManyToOne(
    () => RoleSet,
    roleSet => roleSet.roles,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  roleSet?: RoleSet;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  name!: RoleName;

  @Column('jsonb', { nullable: false })
  credential!: ICredentialDefinition;

  @Column('jsonb', { nullable: false })
  parentCredentials!: ICredentialDefinition[];

  @Column('boolean', { nullable: false })
  requiresEntryRole!: boolean;

  @Column('boolean', { nullable: false })
  requiresSameRoleInParentRoleSet!: boolean;

  @Column('jsonb', { nullable: false })
  userPolicy!: IActorRolePolicy;

  @Column('jsonb', { nullable: false })
  organizationPolicy!: IActorRolePolicy;

  @Column('jsonb', { nullable: false })
  virtualContributorPolicy!: IActorRolePolicy;
}
