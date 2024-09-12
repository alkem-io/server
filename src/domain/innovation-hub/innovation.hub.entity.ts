import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import {
  ENUM_LENGTH,
  NAMEID_MAX_LENGTH_SCHEMA,
  SUBDOMAIN_LENGTH,
} from '@common/constants';
import { InnovationHubType } from './innovation.hub.type.enum';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';

@Entity()
export class InnovationHub extends NameableEntity implements IInnovationHub {
  @Index('REL_156fd30246eb151b9d17716abf')
  @ManyToOne(() => Account, account => account.innovationHubs, {
    eager: false,
    onDelete: 'SET NULL',
  })
  account!: Account;

  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  @Column('varchar', {
    length: SUBDOMAIN_LENGTH,
    unique: true,
  })
  subdomain!: string;

  @Column()
  type!: InnovationHubType;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  spaceVisibilityFilter?: SpaceVisibility;

  @Column('simple-array', {
    nullable: true,
  })
  spaceListFilter?: string[];

  @Column('boolean', { nullable: false })
  listedInStore!: boolean;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: SearchVisibility.ACCOUNT,
  })
  searchVisibility!: SearchVisibility;
}
