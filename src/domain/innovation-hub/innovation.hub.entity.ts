import { ENUM_LENGTH, SUBDOMAIN_LENGTH } from '@common/constants';
import { SearchVisibility } from '@common/enums/search.visibility';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { Account } from '@domain/space/account/account.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { InnovationHubType } from './innovation.hub.type.enum';

@Entity()
export class InnovationHub extends NameableEntity implements IInnovationHub {
  @ManyToOne(
    () => Account,
    account => account.innovationHubs,
    {
      eager: false,
      onDelete: 'SET NULL',
    }
  )
  account!: Account;

  @Column('varchar', {
    length: SUBDOMAIN_LENGTH,
    unique: true,
  })
  subdomain!: string;

  // Explicit column type: the reflected design:type of an enum-typed property
  // is the enum object, not String, under compilers that emit the identifier —
  // which TypeORM cannot map. 'varchar' with no length matches the live column
  // (character varying) exactly.
  //
  // Deliberately NOT varchar(ENUM_LENGTH), despite the usual convention for
  // enum columns: the live column is unbounded, so adding a length would be a
  // real schema change needing its own migration and schema-contract update.
  // This declaration only makes the existing mapping explicit.
  @Column('varchar')
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

  @Column('simple-array', {
    nullable: true,
  })
  innovationPackListFilter?: string[];

  @Column('simple-array', {
    nullable: true,
  })
  virtualContributorListFilter?: string[];

  @Column('boolean', { nullable: false })
  listedInStore!: boolean;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: SearchVisibility.ACCOUNT,
  })
  searchVisibility!: SearchVisibility;
}
