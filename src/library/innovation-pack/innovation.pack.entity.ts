import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { IInnovationPack } from './innovation.pack.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Account } from '@domain/space/account/account.entity';
import { SearchVisibility } from '@common/enums/search.visibility';
import { Profile } from '@domain/common/profile';

@Entity()
export class InnovationPack extends NameableEntity implements IInnovationPack {
  @Index('FK_39991450cf75dc486700ca034c6')
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @Index('FK_77777450cf75dc486700ca034c6')
  @ManyToOne(() => Account, account => account.innovationPacks, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  account?: Account;

  @Index('FK_55555901817dd09d5906537e088')
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
