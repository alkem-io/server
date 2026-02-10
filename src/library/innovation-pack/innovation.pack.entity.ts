import { SearchVisibility } from '@common/enums/search.visibility';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Account } from '@domain/space/account/account.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IInnovationPack } from './innovation.pack.interface';

@Entity()
export class InnovationPack extends NameableEntity implements IInnovationPack {
  @ManyToOne(
    () => Account,
    account => account.innovationPacks,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  account?: Account;

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesSet?: TemplatesSet;

  @Column()
  listedInStore!: boolean;

  @Column('varchar', {
    length: 36,
    nullable: false,
    default: SearchVisibility.ACCOUNT,
  })
  searchVisibility!: SearchVisibility;

  templatesCount = 0;
}
