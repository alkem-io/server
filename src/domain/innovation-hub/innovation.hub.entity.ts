import { Column, Entity, ManyToOne } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { SUBDOMAIN_LENGTH } from '@common/constants';
import { InnovationHubType } from './innovation.hub.type.enum';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';

@Entity()
export class InnovationHub extends NameableEntity implements IInnovationHub {
  @ManyToOne(() => Account, account => account.innovationHubs, {
    eager: false,
    onDelete: 'SET NULL',
  })
  account!: Account;

  @Column({
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

  @Column()
  listedInStore!: boolean;

  @Column('varchar', {
    length: 36,
    nullable: false,
    default: SearchVisibility.ACCOUNT,
  })
  searchVisibility!: SearchVisibility;
}
